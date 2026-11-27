import '../models/setupDraco';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { modelUrl } from '../assetManifest';
import { getGroundHeight } from '../terrain';
import { usePlayerStore } from '../stores/usePlayerStore';
import { isNight } from '../envState';
import { registerNpc, updateNpcPosition, setNpcHidden } from '../interactionRegistry';
import { getDialogueNode, NPC_BY_ID } from '../npcData';
import { npcMarker } from '../questSteps';
import { playPositionalOneShot } from '../audio';
import { NPC_BLIPS } from '../sounds';
import NpcBarkBubble from './NpcBarkBubble';

// AI فقط ۵ بار در ثانیه اجرا می‌شود (نه هر فریم) — طبق قواعد ضد Overthink
const AI_HZ = 0.2;
const LOOK_RANGE = 5;
const BOB_SPEED = 1.5;

// ---- barks محیطی: زمان‌بندی بیرون React (ماژول‌سطح) ----
const BARK_MIN_GAP = 30; // حداقل ۳۰ ثانیه بین دو bark هر NPC
const BARK_MIN_DELAY = 30;
const BARK_MAX_DELAY = 90;
const BARK_MIN_DIST = 5;
const BARK_MAX_DIST = 8;
const barkTimers = new Map(); // npcId → { nextAt, lastAt }

function nextBarkDelay() {
  return BARK_MIN_DELAY + Math.random() * (BARK_MAX_DELAY - BARK_MIN_DELAY);
}

function tryNpcBark(npc, dist, now) {
  if (!npc.barks?.length) return;
  const state = usePlayerStore.getState();
  if (state.activeDialogue || state.npcBark) return;
  if (dist < BARK_MIN_DIST || dist > BARK_MAX_DIST) return;
  const timer = barkTimers.get(npc.id) || { nextAt: now + nextBarkDelay(), lastAt: 0 };
  barkTimers.set(npc.id, timer);
  if (now < timer.nextAt) return;
  if (timer.lastAt && now - timer.lastAt < BARK_MIN_GAP) return;
  timer.lastAt = now;
  timer.nextAt = now + nextBarkDelay();
  const text = npc.barks[Math.floor(Math.random() * npc.barks.length)];
  state.showNpcBark(npc.id, text);
  if (NPC_BLIPS.length) {
    const url = NPC_BLIPS[(npc.blip || 1) % NPC_BLIPS.length];
    playPositionalOneShot(url, [npc.x, 1.3, npc.z], {
      volume: 0.26,
      channel: 'effects',
      refDistance: 2,
      maxDistance: 14,
      playbackRate: (npc.pitch || 1) * (0.94 + Math.random() * 0.12),
    });
  }
}

// مدل NPC را با ارتفاع دلخواه نرمال می‌کند (مثل Fitted، اما کلون اسکلتی امن)
function useNpcModel(modelKey, height) {
  const url = modelUrl(modelKey);
  const { scene } = useGLTF(url);
  const data = useMemo(() => {
    const copy = SkeletonUtils.clone(scene);
    copy.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });
    const box = new THREE.Box3().setFromObject(copy);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const s = height / (size.y || 1);
    return {
      object: copy,
      scale: s,
      offset: [-center.x * s, -box.min.y * s, -center.z * s],
      // لنگر کلاه از bbox واقعی (نه عدد ثابت): بالای سر در فضای گروه داخلی
      hatY: (box.max.y - box.min.y) * s - 0.05,
      headRadius: Math.max(size.x, size.z) * 0.5 * s,
    };
  }, [scene, height]);
  return { url, ...data };
}

function NpcNamePlate({ name, accent, marker, bark, y = 2.2 }) {
  return (
    <Html center position={[0, y, 0]} distanceFactor={14} zIndexRange={[20, 0]}>
      <div className="pointer-events-none flex select-none flex-col items-center gap-1">
        {bark && <NpcBarkBubble text={bark.text} accent={accent} until={bark.until} />}
        <div className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/15 bg-[#171426]/75 px-2.5 py-1 text-[11px] text-[#f5ebdd] backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
          <span>{name}</span>
        </div>
        {marker && (
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full border border-[#ffc66d]/60 bg-[#171426]/85 text-[13px] font-extrabold text-[#ffc66d] animate-bounce"
            style={{ animationDuration: '2s' }}
          >
            {marker}
          </div>
        )}
      </div>
    </Html>
  );
}

// فاز نوسان idle — قطعی (بدون Math.random در رندر) تا رندر خالص بماند
function phaseFor(id) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) % 997;
  return (h / 997) * Math.PI * 2;
}

// باز کردن دیالوگ با ساخت ctx زنده از استور
function openNpcDialogue(npcId) {
  const state = usePlayerStore.getState();
  const level = state.friendshipLevels[npcId] || 1;
  const ctx = { state, level, night: isNight() };
  const node = getDialogueNode(npcId, ctx);
  if (!node) return;
  state.setActiveDialogue({ npcId, nodeKey: node.key, text: node.text, choices: node.choices });
}

export default function NPC({ data }) {
  const groupRef = useRef(null);
  const innerRef = useRef(null);
  const { object, scale, offset, hatY } = useNpcModel(data.modelKey, data.height);
  const { x: homeX, z: homeZ } = data;

  // وضعیت AI بیرون React (ref) — هر فریم فقط خوانده می‌شود
  const ai = useRef({
    x: homeX,
    z: homeZ,
    targetX: homeX,
    targetZ: homeZ,
    nextThink: 0,
    yaw: data.rotation,
    baseY: getGroundHeight(homeX, homeZ),
    phase: phaseFor(data.id),
  });

  // شاخص‌های رندر فقط وقتی تغییر کنند (marker / visible) — نه هر فریم
  const [marker, setMarker] = useState(null);
  const [visible, setVisible] = useState(!data.nightOnly);
  const level = usePlayerStore((s) => s.friendshipLevels[data.id] || 1);
  const completed = usePlayerStore((s) => Boolean(s.npcInteractions[data.id]?.completed));
  const bark = usePlayerStore((s) => (s.npcBark?.npcId === data.id ? s.npcBark : null));

  // ثبت در رجیستری تعامل (NPC شبانه تا وقتی شب نشده قابل تعامل نیست)
  useEffect(() => {
    const unsub = registerNpc({
      id: data.id,
      label: `گفتگو با ${data.name}`,
      x: homeX,
      z: homeZ,
      radius: data.talkRadius,
      hidden: Boolean(data.nightOnly) && !isNight(),
      action: () => openNpcDialogue(data.id),
    });
    return unsub;
  }, [data.id, data.name, data.talkRadius, homeX, homeZ, data.nightOnly]);

  // نشانگر «!»/«?» را هر ۱ ثانیه از استور تازه می‌کند (بدون setState تکراری)
  useEffect(() => {
    const tick = () => {
      const state = usePlayerStore.getState();
      const m = npcMarker(data.id, state);
      setMarker((prev) => (prev === m ? prev : m));
      setVisible((prev) => {
        if (!data.nightOnly) return prev === true ? prev : true;
        const show = isNight();
        return prev === show ? prev : show;
      });
      // NPC شبانه بیرون از شب نباید با E قابل تعامل باشد
      if (data.nightOnly) setNpcHidden(data.id, !isNight());
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [data.id, data.nightOnly, completed, level]);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    const inner = innerRef.current;
    if (!group || !inner) return;
    const now = clock.elapsedTime;
    const st = ai.current;

    // ---- AI با نرخ ۵ هرتز ----
    if (now >= st.nextThink) {
      st.nextThink = now + AI_HZ;
      const state = usePlayerStore.getState();
      const local = state.local;
      const dx = local.x - st.x;
      const dz = local.z - st.z;
      const dist = Math.hypot(dx, dz);

      if (dist < LOOK_RANGE) {
        // نگاه به بازیکن
        st.yaw = Math.atan2(dx, dz);
        st.targetX = st.x;
        st.targetZ = st.z;
      } else {
        // پرسه‌گردی آرام داخل شعاع خانه
        const away = Math.hypot(st.x - homeX, st.z - homeZ);
        if (away > data.wander || Math.hypot(st.targetX - st.x, st.targetZ - st.z) < 0.3) {
          const angle = Math.random() * Math.PI * 2;
          const r = Math.random() * data.wander;
          st.targetX = homeX + Math.cos(angle) * r;
          st.targetZ = homeZ + Math.sin(angle) * r;
        }
      }

      // bark محیطی: فقط وقتی بازیکن در بازه‌ی ۵..۸ واحد است و NPC شبانه نمایان است
      if (!data.nightOnly || isNight()) tryNpcBark(data, dist, now);
    }

    // ---- حرکت نرم به سمت هدف ----
    const tx = st.targetX - st.x;
    const tz = st.targetZ - st.z;
    const tdist = Math.hypot(tx, tz);
    if (tdist > 0.05) {
      const speed = 0.55;
      st.x += (tx / tdist) * Math.min(tdist, speed * 0.2);
      st.z += (tz / tdist) * Math.min(tdist, speed * 0.2);
      if (tdist > 0.3) st.yaw = Math.atan2(tx, tz);
    }

    const groundY = getGroundHeight(st.x, st.z);
    st.baseY += (groundY - st.baseY) * 0.15;

    group.position.set(st.x, st.baseY, st.z);
    group.rotation.y += ((st.yaw + (data.facing || 0)) - group.rotation.y) * 0.12;

    // ---- idle bob (انیمیشن رویه‌ای برای مدل‌های بدون ریگ) ----
    const t = now * BOB_SPEED + st.phase;
    inner.position.y = Math.sin(t) * 0.02 + Math.abs(Math.sin(t * 0.5)) * 0.01;
    inner.rotation.z = Math.sin(t * 0.7) * 0.012;

    // موقعیت زنده را برای تشخیص نزدیکی E به‌روز کن
    updateNpcPosition(data.id, st.x, st.z);
  });

  if (!visible) return null;

  return (
    <group ref={groupRef} position={[homeX, getGroundHeight(homeX, homeZ), homeZ]} rotation={[0, data.rotation, 0]}>
      <group ref={innerRef}>
        <group position={offset} scale={scale}>
          <primitive object={object} />
        </group>
      </group>
      <NpcNamePlate
        name={data.name}
        accent={data.accent}
        marker={marker}
        bark={bark}
        y={hatY + 0.45}
      />
    </group>
  );
}

// پیش‌بارگذاری مدل‌های NPC (سبک، بعد از ورود)
Object.values(NPC_BY_ID).forEach((npc) => {
  const url = modelUrl(npc.modelKey);
  if (url) useGLTF.preload(url);
});
