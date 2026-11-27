// ---------------------------------------------------------------------------
// world/StreamedWorld.jsx — پوسته‌ی React برای استریمینگ چانک‌ها (Phase 5)
//
//  • هر ۰.۵ ثانیه موقعیت بازیکن (بیرون React) خوانده می‌شود؛ فقط وقتی مجموعه‌ی
//    چانک‌های فعال عوض شود، state به‌روز می‌شود (نه هر فریم).
//  • رندر درختان/فلور در یک مجموعه InstancedMesh تجمیع‌شده انجام می‌شود.
//  • progressive: در فریم اول فقط شعاع کوچک، بعد از ۲ ثانیه شعاع کامل preset.
//  • حداقل شعاع رندر ۳ است تا با اولین قدم بازیکن، چانک‌ها unload نشوند.
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { usePlayerStore } from '../stores/usePlayerStore';
import { useQualityPreset } from '../stores/useSettingsStore';
import { computeChunkSet, resetChunkState, chunkState } from './ChunkManager';
import { ChunkTrees, ChunkFlora } from './Chunk';
import { placeTrees } from './chunkModel';
import { setActiveTrees } from '../activeTrees';

const CHECK_INTERVAL = 0.5; // ثانیه

export default function StreamedWorld() {
  const preset = useQualityPreset();
  // حداقل ۵ چانک (۱۶۰ واحد) — شعاع کمتر باعث می‌شد لبه‌ی جنگل دیده شود.
  const radius = Math.max(5, Math.round(preset.chunkRadius ?? 5));

  const [set, setSet] = useState(null);
  const timer = useRef(0);
  const warmup = useRef(0);

  // شعاع مؤثر: دو ثانیه‌ی اول کوچک‌تر (progressive loading)
  const effectiveRadius = useRef(Math.min(2, radius));

  useEffect(() => {
    // تغییر تنظیمات گرافیکی → بازسازی فوری
    resetChunkState();
  }, [radius, preset.treeDensity, preset.grassDensity]);

  // پرایم اولیه: بدون انتظار ۰.۵ ثانیه، بلافاصله چانک‌های اطراف بازیکن
  useEffect(() => {
    const { local } = usePlayerStore.getState();
    const next = computeChunkSet(
      local.x,
      local.z,
      effectiveRadius.current,
      preset.treeDensity * 3.25,
      preset.grassDensity
    );
    if (next) setSet(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, delta) => {
    warmup.current += Math.min(delta, 0.1);
    if (warmup.current > 2) effectiveRadius.current = radius;

    timer.current += Math.min(delta, 0.1);
    if (timer.current < CHECK_INTERVAL) return;
    timer.current = 0;

    const { local } = usePlayerStore.getState();
    const next = computeChunkSet(
      local.x,
      local.z,
      effectiveRadius.current,
      preset.treeDensity * 3.25,
      preset.grassDensity
    );
    if (next) setSet(next);
  });

  // ارتفاع/شیب زمین یک‌بار روی درختان اعمال می‌شود
  const groups = useMemo(() => {
    if (!set) return null;
    return {
      near: placeTrees(set.groups.near),
      far: placeTrees(set.groups.far),
      far2: placeTrees(set.groups.far2),
    };
  }, [set]);

  // ثبت درختان فعال برای برخورد بازیکن (بدون درخت نامرئی)
  useEffect(() => {
    if (!groups) return;
    setActiveTrees([...groups.near, ...groups.far, ...groups.far2]);
  }, [groups]);

  const flora = useMemo(
    () => set?.flora ?? { grass: [], flowers: [], rocks: [], mushrooms: [] },
    [set]
  );

  if (!groups) return null;

  return (
    <group name={`streamed-${chunkState.signature}`}>
      <ChunkTrees groups={groups} />
      <ChunkFlora flora={flora} />
    </group>
  );
}
