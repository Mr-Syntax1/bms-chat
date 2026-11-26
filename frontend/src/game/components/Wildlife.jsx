// ---------------------------------------------------------------------------
// Wildlife.jsx — حیات وحش ساده: پرسه‌زدن + فرار از بازیکن.
//
//  • مدل‌ها از assetManifest می‌آیند؛ هر نمونه با useModelParts سبک رندر می‌شود.
//  • AI فقط ۱۰ هرتز آپدیت می‌شود و موقعیت‌ها در ref نگه داشته می‌شوند
//    (هیچ setState در هر فریم نداریم؛ فقط سوییچ Idle/Run است).
//  • زون‌ها: خرگوش/گوزن جنگل، اردک نزدیک آب، قورباغه برکه، جغد نزدیک درخت،
//    تشی لبه‌ی جنگل.
// ---------------------------------------------------------------------------
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { modelUrl } from '../assetManifest';
import { useModelParts } from '../models/useModelParts';
import { useQualityPreset } from '../stores/useSettingsStore';
import { usePlayerStore } from '../stores/usePlayerStore';
import { getGroundHeight, isInWater, pathDistance, POND, WATER_LEVEL, CAMP_RADIUS } from '../terrain';

const AI_STEP = 1 / 10; // ۱۰ هرتز
const FLEE_RANGE = 3;
const FLEE_TIME = 2.4;
const WANDER_RADIUS = 4;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// گونه‌ها: مدل، ارتفاع هدف، منطقه، سرعت، تعداد در هر کیفیت
const SPECIES = {
  rabbit: {
    model: 'animals.rabbit',
    height: 0.62,
    speed: 1.9,
    wander: 3.4,
    flee: 3.4,
    counts: { low: 2, medium: 3, high: 4 },
    zone: 'forest',
    yOffset: 0,
    pet: true,
  },
  deer: {
    model: 'animals.deer',
    height: 1.55,
    speed: 1.5,
    wander: 5,
    flee: 3.6,
    counts: { low: 1, medium: 2, high: 2 },
    zone: 'forest',
    yOffset: 0,
  },
  duck: {
    model: 'animals.duck',
    height: 0.5,
    speed: 1.0,
    wander: 3,
    flee: 2.2,
    counts: { low: 1, medium: 2, high: 3 },
    zone: 'water',
    yOffset: 0.02,
  },
  owl: {
    model: 'animals.owl',
    height: 0.62,
    speed: 0.9,
    wander: 2,
    flee: 1.4,
    counts: { low: 1, medium: 1, high: 2 },
    zone: 'forest',
    yOffset: 0,
  },
  porcupine: {
    model: 'animals.porcupine',
    height: 0.5,
    speed: 1.1,
    wander: 3,
    flee: 2.4,
    counts: { low: 1, medium: 1, high: 2 },
    zone: 'edge',
    yOffset: 0,
  },
};

function validGround(x, z, zone) {
  if (zone === 'water') return true;
  if (isInWater(x, z)) return false;
  if (getGroundHeight(x, z) < WATER_LEVEL + 0.25) return false;
  if (pathDistance(x, z) < 1.8) return false;
  return true;
}

// تولید نقاط اولیه‌ی هر گونه (seed ثابت تا همه‌ی کلاینت‌ها یکسان ببینند)
function buildSpawns(tier) {
  const rand = mulberry32(99117);
  const spawns = [];
  let id = 0;

  for (const [type, spec] of Object.entries(SPECIES)) {
    const count = spec.counts[tier] ?? spec.counts.medium;
    for (let i = 0; i < count; i += 1) {
      let x = 0;
      let z = 0;
      let ok = false;
      for (let tries = 0; tries < 30 && !ok; tries += 1) {
        if (spec.zone === 'water') {
          // اردک داخل آب برکه
          const angle = rand() * Math.PI * 2;
          const r = rand() * POND.radius * 0.62;
          x = POND.x + Math.cos(angle) * r;
          z = POND.z + Math.sin(angle) * r;
          ok = isInWater(x, z);
        } else if (spec.zone === 'edge') {
          x = -40 + rand() * 30;
          z = -70 + rand() * 130;
          ok = validGround(x, z, 'forest') && Math.hypot(x, z) > CAMP_RADIUS + 4;
        } else {
          x = -80 + rand() * 62;
          z = -88 + rand() * 176;
          ok = validGround(x, z, 'forest') && Math.hypot(x, z) > CAMP_RADIUS + 5;
        }
      }
      if (!ok) continue;
      spawns.push({
        id: id++,
        type,
        homeX: x,
        homeZ: z,
        x,
        z,
        rot: rand() * Math.PI * 2,
        phase: rand() * Math.PI * 2,
        nextWander: rand() * 4,
        targetX: x,
        targetZ: z,
        fleeUntil: 0,
        moving: false,
        petTime: 0,
        petted: false,
      });
    }
  }
  return spawns;
}

// قلب‌های نوازش: سه اسپرایت ساده که بالای سر بالا می‌روند
function Hearts({ visible }) {
  const ref = useRef(null);
  useFrame(({ clock }) => {
    const group = ref.current;
    if (!group) return;
    group.visible = Boolean(visible());
    if (!group.visible) return;
    const t = clock.elapsedTime;
    group.children.forEach((heart, i) => {
      const p = (t * 0.6 + i * 0.33) % 1;
      heart.position.y = 0.75 + p * 0.5;
      heart.position.x = Math.sin(p * 6 + i) * 0.1;
      heart.material.opacity = 0.85 * (1 - p);
    });
  });
  return (
    <group ref={ref} visible={false}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0.8, 0]}>
          <sphereGeometry args={[0.035, 6, 5]} />
          <meshBasicMaterial color="#ff8fb1" transparent opacity={0.8} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

// یک حیوان — رندر مدل + حرکت با ref
function Animal({ spawn, spec, geometryInfo }) {
  const groupRef = useRef(null);
  const innerRef = useRef(null);
  const stateRef = useRef(spawn);
  const accRef = useRef(0);
  const { parts: modelParts, height, baseY, centerX, centerZ } = geometryInfo;
  const scale = spec.height / (height || 1);

  useFrame(({ clock }, delta) => {
    const group = groupRef.current;
    const inner = innerRef.current;
    const s = stateRef.current;
    if (!group || !inner) return;

    const t = clock.elapsedTime;

    // AI فقط ۱۰ هرتز تصمیم می‌گیرد (نه هر فریم)
    accRef.current += Math.min(delta, 0.05);
    if (accRef.current >= AI_STEP) {
      const step = accRef.current;
      accRef.current = 0;

      const { local } = usePlayerStore.getState();
      const distToPlayer = Math.hypot(local.x - s.x, local.z - s.z);

      // نوازش خرگوش: ایستادن نزدیک برای ۳ ثانیه
      if (spec.pet) {
        if (distToPlayer < 1.8 && !local.moving) {
          s.petTime += step;
          if (s.petTime >= 3 && !s.petted) {
            s.petted = true;
            s.petUntil = t + 2.5;
          }
        } else {
          s.petTime = 0;
        }
        if (s.petted && t > (s.petUntil || 0)) s.petted = false;
      }

      // فرار: اگر بازیکن نزدیک شد (خرگوشِ در حال نوازش فرار نمی‌کند)
      if (distToPlayer < FLEE_RANGE && s.fleeUntil < t && !s.petted) {
        s.fleeUntil = t + FLEE_TIME;
        const dx = s.x - local.x;
        const dz = s.z - local.z;
        const len = Math.hypot(dx, dz) || 1;
        s.targetX = s.x + (dx / len) * 6;
        s.targetZ = s.z + (dz / len) * 6;
      }

      const dx = s.targetX - s.x;
      const dz = s.targetZ - s.z;
      const dist = Math.hypot(dx, dz);
      const fleeing = t < s.fleeUntil;
      const speed = fleeing ? spec.flee : spec.speed;

      if (dist > 0.12) {
        const move = Math.min(dist, speed * step);
        s.x += (dx / dist) * move;
        s.z += (dz / dist) * move;
        s.rot = Math.atan2(dx, dz);
        s.moving = true;
      } else {
        s.moving = false;
        // پرسه‌زدن: هدف تصادفی جدید هر چند ثانیه
        if (!fleeing && t > s.nextWander) {
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * WANDER_RADIUS;
          s.targetX = s.homeX + Math.cos(angle) * radius;
          s.targetZ = s.homeZ + Math.sin(angle) * radius;
          s.nextWander = t + 4 + Math.random() * 4;
        }
      }

      const onWater = spec.zone === 'water' && isInWater(s.x, s.z);
      const ground = onWater ? WATER_LEVEL : getGroundHeight(s.x, s.z);
      const bob = s.moving ? Math.abs(Math.sin(t * (fleeing ? 12 : 7) + s.phase)) * 0.08 : 0;
      group.position.set(s.x, ground + spec.yOffset, s.z);
      group.rotation.y = s.rot;
      inner.position.y = bob;
      inner.rotation.z = s.moving ? Math.sin(t * 8 + s.phase) * 0.04 : 0;
    }
  });

  if (!modelParts.length) return null;

  return (
    <group
      ref={groupRef}
      position={[
        spawn.x,
        spec.zone === 'water' ? WATER_LEVEL : getGroundHeight(spawn.x, spawn.z),
        spawn.z,
      ]}
    >
      <group ref={innerRef}>
        <group scale={scale}>
          <group position={[-centerX, baseY, -centerZ]}>
            {modelParts.map((part, j) => (
              <group key={j} matrixAutoUpdate={false} matrix={part.matrix}>
                <mesh geometry={part.geometry} material={part.material} castShadow receiveShadow />
              </group>
            ))}
          </group>
        </group>
        {spec.pet && <Hearts visible={() => stateRef.current.petted} />}
      </group>
    </group>
  );
}

// مدل هر گونه یک بار لود می‌شود؛ همه‌ی نمونه‌ها از همان قطعات استفاده می‌کنند
function SpeciesGroup({ type, spawns, tier }) {
  const spec = SPECIES[type];
  const url = modelUrl(spec.model);
  const info = useModelParts(url);
  if (!url || !info.parts.length) return null;
  return (
    <>
      {spawns.map((s) => (
        <Animal key={`${tier}-${s.id}`} spawn={s} spec={spec} geometryInfo={info} />
      ))}
    </>
  );
}

export default function Wildlife() {
  const preset = useQualityPreset();
  const tier = preset.treeDensity > 700 ? 'high' : preset.treeDensity > 500 ? 'medium' : 'low';
  const spawns = useMemo(() => buildSpawns(tier), [tier]);

  const byType = useMemo(() => {
    const map = { rabbit: [], deer: [], duck: [], owl: [], porcupine: [] };
    spawns.forEach((s) => {
      if (map[s.type]) map[s.type].push(s);
    });
    return map;
  }, [spawns]);

  return (
    <group>
      {Object.entries(byType).map(([type, list]) =>
        list.length ? <SpeciesGroup key={type} type={type} spawns={list} tier={tier} /> : null
      )}
    </group>
  );
}
