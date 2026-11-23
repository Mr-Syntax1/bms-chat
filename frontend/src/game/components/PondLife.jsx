import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { POND, WATER_LEVEL, isInWater, getGroundHeight } from '../terrain';
import { modelUrl } from '../assetManifest';
import { useModelParts } from '../models/useModelParts';
import { useQualityPreset } from '../stores/useSettingsStore';

// ---------------------------------------------------------------------------
// زندگی برکه: نیلوفرهای آبی + قورباغه‌ی نشسته روی یکی از برگ‌ها.
// همه‌چیز قطعی (seed ثابت) است تا همه‌ی کلاینت‌ها یک صحنه ببینند.
// ---------------------------------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PAD_COUNT = { low: 0, medium: 8, high: 14 };

function buildPads(count) {
  const rand = mulberry32(515151);
  const pads = [];
  let guard = 0;
  while (pads.length < count && guard < count * 40) {
    guard += 1;
    const angle = rand() * Math.PI * 2;
    // فقط داخل آب برکه (کمی داخل‌تر از لبه)
    const radius = rand() * POND.radius * 0.66;
    const x = POND.x + Math.cos(angle) * radius;
    const z = POND.z + Math.sin(angle) * radius;
    if (!isInWater(x, z)) continue;
    const depth = WATER_LEVEL - getGroundHeight(x, z);
    if (depth < 0.35) continue;
    if (pads.some((p) => Math.hypot(p.x - x, p.z - z) < 1.7)) continue;
    pads.push({
      x,
      z,
      scale: 0.55 + rand() * 0.55,
      rotation: rand() * Math.PI * 2,
      phase: rand() * Math.PI * 2,
    });
  }
  return pads;
}

function LilyPads({ pads, url }) {
  const { parts, height, centerX, centerZ } = useModelParts(url);
  const groupRef = useRef(null);

  const s = 1.55 / height;

  // تکان ملایم روی موج — یک گروه والد می‌چرخد، مقیاس/مکان ثابت است
  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < group.children.length; i += 1) {
      const pad = pads[i];
      if (!pad) continue;
      group.children[i].position.y = WATER_LEVEL + 0.045 + Math.sin(t * 0.9 + pad.phase) * 0.012;
    }
  });

  if (!parts.length) return null;

  return (
    <group ref={groupRef}>
      {pads.map((pad, i) => (
        <group
          key={i}
          position={[pad.x - centerX * s * pad.scale, WATER_LEVEL + 0.045, pad.z - centerZ * s * pad.scale]}
          rotation={[0, pad.rotation, 0]}
          scale={s * pad.scale}
        >
          {parts.map((part, j) => (
            <group key={j} matrixAutoUpdate={false} matrix={part.matrix}>
              <mesh geometry={part.geometry} material={part.material} receiveShadow />
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

// قورباغه‌ی روی نیلوفر: بالا-پایین آرام + پرش کوتاه گاه‌به‌گاه
function Frog({ pads, url }) {
  const { parts, height, centerX, centerZ } = useModelParts(url);
  const groupRef = useRef(null);
  const pad = pads.find((p) => p.scale > 0.7) || pads[0];

  // مدل Frog در واحدهای بسیار بزرگ است؛ ارتفاع هدف کوچک و طبیعی
  const s = 0.34 / height;

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;
    const t = clock.elapsedTime;
    const cycle = t % 9;
    // ۰..۱ در طول ۰.۶ ثانیه‌ی پرش، بقیه نشسته
    const hop = cycle < 0.6 ? Math.sin((cycle / 0.6) * Math.PI) : 0;
    group.position.y = WATER_LEVEL + 0.06 + hop * 0.26;
    group.rotation.y = (pad?.rotation ?? 0) + Math.sin(t * 0.4) * 0.4;
  });

  if (!parts.length || !pad) return null;

  return (
    <group
      ref={groupRef}
      position={[pad.x - centerX * s, WATER_LEVEL + 0.06, pad.z - centerZ * s]}
      rotation={[0, pad.rotation, 0]}
      scale={s}
    >
      {parts.map((part, j) => (
        <group key={j} matrixAutoUpdate={false} matrix={part.matrix}>
          <mesh geometry={part.geometry} material={part.material} castShadow />
        </group>
      ))}
    </group>
  );
}

export default function PondLife() {
  const preset = useQualityPreset();
  const tier = preset.treeDensity > 700 ? 'high' : preset.treeDensity > 500 ? 'medium' : 'low';
  const count = PAD_COUNT[tier];
  const pads = useMemo(() => (count ? buildPads(count) : []), [count]);

  if (!pads.length) return null;

  return (
    <group>
      <LilyPads pads={pads} url={modelUrl('undergrowth.lilypad')} />
      {tier !== 'low' && <Frog pads={pads} url={modelUrl('animals.frog')} />}
    </group>
  );
}
