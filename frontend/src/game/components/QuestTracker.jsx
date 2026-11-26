// ---------------------------------------------------------------------------
// QuestTracker.jsx — فلش‌های مسیر چندهدفه برای کوئست‌های فعال (Phase 4.5)
//
//  • هر هدف با location از NPC_QUESTS یک ردیف با فلش جهت‌دار نشان می‌دهد.
//  • زاویه/فاصله در یک حلقه‌ی rAF با throttle ۱۰Hz محاسبه و مستقیم روی DOM
//    نوشته می‌شود (بدون setState در هر فریم). این کامپوننت بیرون Canvas است،
//    پس از useFrame استفاده نمی‌شود (فقط داخل Canvas کار می‌کند).
//  • فقط کوئست‌های دارای location فلش می‌گیرند؛ در فاصله‌ی ≤۳ واحد پنهان می‌شود.
// ---------------------------------------------------------------------------
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { usePlayerStore } from '../stores/usePlayerStore';
import { NPC_QUESTS, npcQuestStatus } from '../questSteps';
import { GameIcon } from '../ui/icons';

const UPDATE_INTERVAL = 100; // ۱۰ هرتز (ms)
const HIDE_DISTANCE = 3;
const MAX_TRACKED = 4;

// ۰ درجه = بالای صفحه؛ جلو در صحنه محور z- است
function angleDeg(dx, dz) {
  return (Math.atan2(dx, -dz) * 180) / Math.PI;
}

function TrackerRow({ entry, onMount }) {
  const rootRef = useRef(null);

  useEffect(() => {
    onMount(entry.npcId, rootRef.current);
    return () => onMount(entry.npcId, null);
  }, [entry.npcId, onMount]);

  return (
    <div
      ref={rootRef}
      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#171426]/75 px-2 py-1 backdrop-blur-md"
      style={{ opacity: 0 }}
    >
      <span
        data-qt-icon
        className="text-[#ffc66d]"
        aria-hidden="true"
        style={{ display: 'inline-flex', transition: 'transform 120ms linear' }}
      >
        <GameIcon name="arrowUp" className="h-3.5 w-3.5" strokeWidth={2.2} />
      </span>
      <span className="flex-1 truncate text-[9.5px] font-bold text-[#f5ebdd]/85">{entry.name}</span>
      <span data-qt-dist className="font-mono text-[9px] text-[#65F5A0]/85" />
    </div>
  );
}

export default function QuestTracker() {
  // یک امضای رشته‌ای پایدار (بدون آرایه‌ی تازه) تا re-render فقط با تغییر وضعیت باشد
  const signature = usePlayerStore((s) =>
    Object.values(NPC_QUESTS)
      .filter((q) => q.location)
      .map((q) => `${q.npcId}:${npcQuestStatus(q.npcId, s)}`)
      .filter((entry) => !entry.endsWith(':offer') && !entry.endsWith(':done'))
      .join('|')
  );

  const tracked = useMemo(() => {
    if (!signature) return [];
    return signature
      .split('|')
      .map((entry) => entry.split(':')[0])
      .map((npcId) => {
        const quest = NPC_QUESTS[npcId];
        return quest ? { npcId, name: quest.title, x: quest.location.x, z: quest.location.z } : null;
      })
      .filter(Boolean)
      .slice(0, MAX_TRACKED);
  }, [signature]);

  const nodesRef = useRef(new Map());

  const setNode = useCallback((id, el) => {
    if (el) nodesRef.current.set(id, el);
    else nodesRef.current.delete(id);
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = 0;

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      if (now - last < UPDATE_INTERVAL) return;
      last = now;

      const { local } = usePlayerStore.getState();
      for (const entry of tracked) {
        const root = nodesRef.current.get(entry.npcId);
        if (!root) continue;
        const dx = entry.x - local.x;
        const dz = entry.z - local.z;
        const dist = Math.hypot(dx, dz);
        if (dist <= HIDE_DISTANCE) {
          if (root.style.opacity !== '0') root.style.opacity = '0';
          continue;
        }
        if (root.style.opacity !== '1') root.style.opacity = '1';
        const icon = root.querySelector('[data-qt-icon]');
        if (icon) icon.style.transform = `rotate(${angleDeg(dx, dz).toFixed(0)}deg)`;
        const distEl = root.querySelector('[data-qt-dist]');
        const text = `${Math.round(dist)}m`;
        if (distEl && distEl.textContent !== text) distEl.textContent = text;
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [tracked]);

  if (tracked.length === 0) return null;

  return (
    <div className="pointer-events-none absolute bottom-24 left-3 z-30 flex w-[168px] flex-col gap-1">
      {tracked.map((entry) => (
        <TrackerRow key={entry.npcId} entry={entry} onMount={setNode} />
      ))}
    </div>
  );
}
