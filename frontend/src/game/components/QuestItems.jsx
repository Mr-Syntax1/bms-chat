import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Sparkles } from '@react-three/drei';
import { usePlayerStore } from '../stores/usePlayerStore';
import { QUEST_SPOTS } from '../sceneLayout';
import Fitted from '../models/Fitted';
import { modelUrl } from '../assetManifest';
import {
  PostLanternModel,
  WoodenSignModel,
} from '../models/props';

// نشانگر تعامل: دایره + متن بالای شیء (قفل‌دار یا فعال)
function InteractHint({ label, locked = false, y = 2.2 }) {
  return (
    <Html center position={[0, y, 0]} distanceFactor={11} zIndexRange={[30, 0]}>
      <div className="flex flex-col items-center gap-1 pointer-events-none select-none">
        <div
          className={`h-3 w-3 rounded-full border-2 animate-pulse ${locked
            ? 'border-warning-400 bg-warning-500/30'
            : 'border-primary-300 bg-primary-500/40'
            }`}
        />
        <div className="px-2 py-0.5 rounded-full bg-surface-950/85 border border-white/20 text-[10px] text-surface-50 whitespace-nowrap">
          {locked ? `🔒 ${label}` : `${label} — E`}
        </div>
      </div>
    </Html>
  );
}

// تشخیص نزدیکی به آیتم (برای نمایش نشانگر) — با سلکتور سبک به‌جای useFrame
function useNearby(key) {
  return usePlayerStore((s) => s.nearInteractable?.key === key);
}

// ذره‌ی ستاره‌ای بالارونده بعد از روشن شدن فانوس (یک‌بار، سپس حذف)
function StarBurst({ active }) {
  const ref = useRef(null);
  const startRef = useRef(0);
  const [done, setDone] = useState(false);

  const positions = useMemo(() => {
    const arr = new Float32Array(60 * 3);
    let seed = 777;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let i = 0; i < 60; i += 1) {
      arr[i * 3] = (rand() - 0.5) * 0.8;
      arr[i * 3 + 1] = rand() * 1.2;
      arr[i * 3 + 2] = (rand() - 0.5) * 0.8;
    }
    return arr;
  }, []);

  useEffect(() => {
    if (!active) return undefined;
    startRef.current = performance.now();
    const timer = setTimeout(() => setDone(true), 2600);
    return () => clearTimeout(timer);
  }, [active]);

  useFrame(() => {
    if (!active || done || !ref.current) return;
    const t = (performance.now() - startRef.current) / 1000;
    ref.current.position.y = 1.6 + t * 1.4;
    ref.current.material.opacity = Math.max(0, 1 - t / 2.4);
  });

  if (!active || done) return null;

  return (
    <points ref={ref} position={[0, 1.6, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#ffd479" size={0.09} transparent opacity={1} depthWrite={false} />
    </points>
  );
}

// یک تکه نقشه: شناور روی یک تخته‌سنگ کوچک با درخشش ملایم
function Parchment({ index, spot }) {
  const collected = usePlayerStore((s) => s.collected.parchments.includes(index));
  const near = useNearby(`parchment-${index}`);
  const ref = useRef(null);
  // لحظه‌ی کشف: پس از برداشتن، ذرات ستاره‌ای کوتاه نمایش داده می‌شود
  const [justCollected, setJustCollected] = useState(false);
  const prevCollected = useRef(collected);

  useEffect(() => {
    if (collected && !prevCollected.current) {
      setJustCollected(true);
      const timer = setTimeout(() => setJustCollected(false), 2600);
      prevCollected.current = collected;
      return () => clearTimeout(timer);
    }
    prevCollected.current = collected;
    return undefined;
  }, [collected]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = 1.05 + Math.sin(clock.elapsedTime * 1.5 + index) * 0.08;
    ref.current.rotation.y = spot.rotation + clock.elapsedTime * 0.35;
  });

  if (collected) {
    if (!justCollected) return null;
    return (
      <group position={[spot.x, 0, spot.z]}>
        <StarBurst active />
      </group>
    );
  }

  return (
    <group position={[spot.x, 0, spot.z]}>
      {/* پایه‌ی سنگی کوچک تا تکه نقشه در جنگل دیده شود */}
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.42, 0.52, 0.44, 8]} />
        <meshStandardMaterial color="#4a4a52" roughness={0.95} flatShading />
      </mesh>

      <group ref={ref} position={[0, 1.05, 0]}>
        <Fitted url={modelUrl('quest.parchment')} height={0.95} />
        <pointLight color="#ffe6a8" intensity={3} distance={5} decay={2} />
        <Sparkles count={12} scale={[0.9, 0.9, 0.9]} size={2} speed={0.25} color="#ffe6a8" />
      </group>

      {near && <InteractHint label="تکه نقشه" y={2.4} />}
    </group>
  );
}

// یک فانوس مأموریت
function Lantern({ index, spot }) {
  const lit = usePlayerStore((s) => s.collected.lanterns.includes(index));
  const parchments = usePlayerStore((s) => s.quests.parchments);
  const near = useNearby(`lantern-${index}`);
  const locked = parchments < 3;

  return (
    <group position={[spot.x, 0, spot.z]}>
      <group scale={1.1}>
        <PostLanternModel />
      </group>
      {lit && (
        <>
          <pointLight position={[0, 2.6, 0]} color="#ffa94d" intensity={14} distance={16} decay={1.7} />
          <mesh position={[0, 2.6, 0]}>
            <sphereGeometry args={[0.16, 10, 10]} />
            <meshBasicMaterial color="#ffd08a" />
          </mesh>
          <Sparkles count={16} scale={[1.2, 1.6, 1.2]} position={[0, 2.6, 0]} size={2.4} speed={0.3} color="#ffcf7a" />
          <StarBurst active />
        </>
      )}
      {near && !lit && <InteractHint label="روشن کردن فانوس" locked={locked} />}
    </group>
  );
}

// چوب ماهیگیری خوابیده روی اسکله + کلید شناور بعد از صید
function FishingRod() {
  const spot = QUEST_SPOTS.fishingRod;
  const hasKey = usePlayerStore((s) => s.quests.hasKey);
  const chestOpened = usePlayerStore((s) => s.quests.chestOpened);
  const lanterns = usePlayerStore((s) => s.quests.lanterns);
  const near = useNearby('fishing-rod');
  const locked = lanterns < 5;
  const keyRef = useRef(null);
  const rodRef = useRef(null);
  const fishingUntilRef = useRef(0);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (keyRef.current) keyRef.current.rotation.y = t * 1.4;
    // انیمیشن ساده‌ی ماهیگیری: تاب چوب بعد از فشردن E
    if (rodRef.current) {
      const fishing = performance.now() < fishingUntilRef.current;
      const amp = fishing ? 0.22 : 0.05;
      const speed = fishing ? 7.5 : 2.4;
      rodRef.current.rotation.z = Math.PI / 2 + Math.sin(t * speed) * amp;
    }
  });

  // هنگام نزدیک بودن + فشردن E، چوب چند لحظه تاب می‌خورد
  useEffect(() => {
    if (!near || locked || hasKey) return undefined;
    const onKey = (event) => {
      if (event.code !== 'KeyE') return;
      fishingUntilRef.current = performance.now() + 900;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [near, locked, hasKey]);

  return (
    <group position={[spot.x, 0.16, spot.z]} rotation={[0, spot.rotation, 0]}>
      {/* چوب ماهیگیری خوابیده روی تخته‌های اسکله */}
      <group ref={rodRef} rotation={[0, 0, Math.PI / 2]}>
        <Fitted url={modelUrl('fishing.rod')} height={2.4} />
      </group>

      {/* کلید صیدشده: تا باز شدن صندوقچه بالای اسکله می‌چرخد */}
      {hasKey && !chestOpened && (
        <group ref={keyRef} position={[0, 1.3, 0]}>
          <Fitted url={modelUrl('quest.key')} height={0.42} />
          <pointLight color="#ffd24d" intensity={6} distance={7} decay={2} />
        </group>
      )}

      {near && !hasKey && <InteractHint label="ماهیگیری" locked={locked} />}
    </group>
  );
}

// صندوقچه‌ی گنج: باز شدن با تیلت ملایم + نور طلایی قوی + ذرات سکه
function TreasureChest() {
  const spot = QUEST_SPOTS.chest;
  const opened = usePlayerStore((s) => s.quests.chestOpened);
  const hasKey = usePlayerStore((s) => s.quests.hasKey);
  const near = useNearby('treasure');
  const chestRef = useRef(null);

  useFrame(({ clock }, delta) => {
    const chest = chestRef.current;
    if (!chest) return;
    const target = opened ? -0.26 : 0;
    chest.rotation.x += (target - chest.rotation.x) * Math.min(1, delta * 5);
    if (opened) {
      chest.position.y = 0.12 + Math.sin(clock.elapsedTime * 1.6) * 0.03;
    }
  });

  return (
    <group position={[spot.x, 0.1, spot.z]}>
      <group ref={chestRef}>
        <Fitted url={modelUrl('quest.chest')} height={1.15} />
      </group>
      {opened && (
        <>
          <pointLight position={[0, 1.6, 0]} color="#ffd24d" intensity={70} distance={26} decay={1.5} />
          <Sparkles color="#ffd24d" count={70} scale={[2.4, 2.8, 2.4]} position={[0, 1.4, 0]} size={3.4} speed={0.7} />
        </>
      )}
      {near && !opened && <InteractHint label="باز کردن صندوقچه" locked={!hasKey} />}
    </group>
  );
}

// تابلوی خاطره
function WoodenSign({ index, spot }) {
  const read = usePlayerStore((s) => (s.collected.signs || []).includes(index));
  const near = useNearby(`sign-${index}`);

  return (
    <group position={[spot.x, 0, spot.z]} rotation={[0, spot.rotation, 0]}>
      <group scale={0.9}>
        <WoodenSignModel />
      </group>
      {near && <InteractHint label={read ? 'دوباره بخوان' : 'خواندن تابلو'} />}
    </group>
  );
}

// صدف/ستاره‌ی قابل جمع‌آوری — Fitted هر مدل را با ارتفاع ثابت نرمال می‌کند
// (مدل‌های Starfish/Seashell bbox بزرگ و آفست‌دار دارند)
const SHELL_VARIANTS = [
  { url: modelUrl('beach.clam'), height: 0.3 },
  { url: modelUrl('beach.seashell'), height: 0.34 },
  { url: modelUrl('beach.starfish'), height: 0.26 },
];

function Collectible({ index, spot }) {
  const collected = usePlayerStore((s) => s.collected.shells.includes(index));
  const near = useNearby(`shell-${index}`);
  const variant = SHELL_VARIANTS[spot.variant % 3];
  const ref = useRef(null);

  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = 0.12 + Math.sin(clock.elapsedTime * 2 + index) * 0.04;
  });

  if (collected) return null;

  return (
    <group position={[spot.x, 0, spot.z]}>
      <group ref={ref} rotation={[0, spot.rotation, 0]}>
        <Fitted url={variant.url} height={variant.height} />
      </group>
      <pointLight color="#9fe8e0" intensity={1.6} distance={2.6} decay={2} position={[0, 0.3, 0]} />
      {near && <InteractHint label="برداشتن" y={1.2} />}
    </group>
  );
}

export default function QuestItems() {
  return (
    <group>
      {QUEST_SPOTS.parchments.map((spot, i) => (
        <Parchment key={`p${i}`} index={i} spot={spot} />
      ))}
      {QUEST_SPOTS.lanterns.map((spot, i) => (
        <Lantern key={`l${i}`} index={i} spot={spot} />
      ))}
      <FishingRod />
      <TreasureChest />
      {QUEST_SPOTS.signs.map((spot, i) => (
        <WoodenSign key={`s${i}`} index={i} spot={spot} />
      ))}
      {QUEST_SPOTS.collectibles.map((spot, i) => (
        <Collectible key={`c${i}`} index={i} spot={spot} />
      ))}
    </group>
  );
}
