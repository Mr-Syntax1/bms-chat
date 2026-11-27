import { useMemo } from 'react';
import * as THREE from 'three';
import { BRIDGE, STEPPING_STONES, WATER_LEVEL, getGroundHeight, RIVER, isInWater } from '../terrain';
import { modelUrl } from '../assetManifest';
import { useModelParts } from '../models/useModelParts';
import { useQualityPreset } from '../stores/useSettingsStore';
import InstancedGLB from '../models/InstancedGLB';

// ---------------------------------------------------------------------------
// مسیرهای خاکی: decal نازک روی زمین در امتداد PATHS.
// ارتفاع از getGroundHeight گرفته می‌شود تا همیشه روی زمین بخوابد.
// ---------------------------------------------------------------------------
import { PATHS } from '../terrain';

const PATH_DECAL_LIFT = 0.035;
const PATH_HALF_WIDTH = 1.05;

function buildPathRibbon(points) {
  const positions = [];
  const indices = [];
  const uvs = [];

  // نمونه‌برداری یکنواخت در امتداد خط شکسته
  const samples = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const steps = Math.max(2, Math.round(Math.hypot(b.x - a.x, b.z - a.z) / 1.4));
    for (let s = 0; s < steps; s += 1) {
      const t = s / steps;
      samples.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
    }
  }
  samples.push(points[points.length - 1]);

  for (let i = 0; i < samples.length; i += 1) {
    const prev = samples[Math.max(0, i - 1)];
    const next = samples[Math.min(samples.length - 1, i + 1)];
    let tx = next.x - prev.x;
    let tz = next.z - prev.z;
    const tl = Math.hypot(tx, tz) || 1;
    tx /= tl;
    tz /= tl;
    const nx = -tz;
    const nz = tx;

    // عرض مسیر کمی نزدیک دو سر باریک می‌شود
    const edge = Math.min(i, samples.length - 1 - i);
    const taper = Math.min(1, edge / 3);
    const w = PATH_HALF_WIDTH * (0.45 + 0.55 * taper);

    for (let c = 0; c <= 1; c += 1) {
      const sign = c === 0 ? -1 : 1;
      const x = samples[i].x + nx * w * sign;
      const z = samples[i].z + nz * w * sign;
      positions.push(x, getGroundHeight(x, z) + PATH_DECAL_LIFT, z);
      uvs.push(c, i / samples.length);
    }
  }

  for (let i = 0; i < samples.length - 1; i += 1) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, c, b, b, c, d);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

function DirtPaths() {
  const preset = useQualityPreset();
  const geos = useMemo(
    () => Object.values(PATHS).map((pts) => buildPathRibbon(pts)),
    []
  );

  // کیفیت کم: مسیرها فقط از طریق رنگ زمین دیده می‌شوند (بدون مش اضافه)
  if (preset.grassDensity < 0.45) return null;

  return (
    <group>
      {geos.map((geo, i) => (
        <mesh key={i} geometry={geo} receiveShadow>
          <meshStandardMaterial
            color="#6d5638"
            roughness={1}
            transparent
            opacity={0.72}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
          />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// پل چوبی روی رودخانه — مستطیل چرخیده هم‌راستا با BRIDGE
// ---------------------------------------------------------------------------
function Bridge() {
  const planks = useMemo(() => {
    const count = Math.max(6, Math.round((BRIDGE.halfLength * 2) / 0.62));
    const list = [];
    for (let i = 0; i < count; i += 1) {
      const t = (i + 0.5) / count;
      const along = -BRIDGE.halfLength + BRIDGE.halfLength * 2 * t;
      list.push({
        x: BRIDGE.cx + BRIDGE.ux * along,
        z: BRIDGE.cz + BRIDGE.uz * along,
      });
    }
    return list;
  }, []);

  return (
    <group>
      {planks.map((p, i) => (
        <mesh
          key={i}
          position={[p.x, BRIDGE.topY - 0.05, p.z]}
          rotation={[0, BRIDGE.angle, 0]}
          receiveShadow
          castShadow
        >
          <boxGeometry args={[BRIDGE.halfWidth * 2, 0.1, 0.56]} />
          <meshStandardMaterial color="#7a5c3c" roughness={0.92} />
        </mesh>
      ))}

      {/* تیرهای کناری */}
      {[-1, 1].map((side) => (
        <mesh
          key={`rail-${side}`}
          position={[
            BRIDGE.cx + BRIDGE.nx * side * (BRIDGE.halfWidth - 0.06),
            BRIDGE.topY + 0.42,
            BRIDGE.cz + BRIDGE.nz * side * (BRIDGE.halfWidth - 0.06),
          ]}
          rotation={[0, BRIDGE.angle, 0]}
          castShadow
        >
          <boxGeometry args={[0.07, 0.07, BRIDGE.halfLength * 2]} />
          <meshStandardMaterial color="#5c4429" roughness={0.95} />
        </mesh>
      ))}

      {/* پایه‌های چوبی داخل آب */}
      {[-1, 1].map((side) =>
        [-0.55, 0.55].map((t, j) => {
          const along = BRIDGE.halfLength * t;
          return (
            <mesh
              key={`post-${side}-${j}`}
              position={[
                BRIDGE.cx + BRIDGE.ux * along + BRIDGE.nx * side * (BRIDGE.halfWidth - 0.1),
                (BRIDGE.topY + WATER_LEVEL) * 0.5 - 0.4,
                BRIDGE.cz + BRIDGE.uz * along + BRIDGE.nz * side * (BRIDGE.halfWidth - 0.1),
              ]}
              castShadow
            >
              <cylinderGeometry args={[0.09, 0.11, BRIDGE.topY - WATER_LEVEL + 0.9, 6]} />
              <meshStandardMaterial color="#4a3826" roughness={0.95} />
            </mesh>
          );
        })
      )}
    </group>
  );
}

// ---------------------------------------------------------------------------
// سنگ‌های عبور از رودخانه — از مدل واقعی RockPathRoundSmall
// ---------------------------------------------------------------------------
function SteppingStones() {
  const { parts } = useModelParts(modelUrl('paths.steppingStone'));

  if (!parts.length) return null;

  return (
    <group>
      {STEPPING_STONES.map((stone, i) => (
        <group
          key={i}
          position={[stone.x, stone.topY - 0.2, stone.z]}
          rotation={[0, stone.x * 1.7, 0]}
          scale={stone.radius * 2.1}
        >
          {parts.map((part, j) => (
            <group key={j} matrixAutoUpdate={false} matrix={part.matrix}>
              <mesh geometry={part.geometry} material={part.material} castShadow receiveShadow />
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// نی‌های کنار رودخانه — نمونه‌سازی‌شده در دو طرف کرانه (Phase 5)
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

function RiverCattails() {
  const items = useMemo(() => {
    const rand = mulberry32(606061);
    const pts = RIVER.points;
    const list = [];
    const halfW = RIVER.width * 0.5;
    for (let i = 0; i < pts.length - 1; i += 1) {
      const a = pts[i];
      const b = pts[i + 1];
      const segLen = Math.hypot(b.x - a.x, b.z - a.z);
      const steps = Math.max(1, Math.round(segLen / 2.6));
      const tx = (b.x - a.x) / (segLen || 1);
      const tz = (b.z - a.z) / (segLen || 1);
      const nx = -tz;
      const nz = tx;
      for (let s = 0; s < steps; s += 1) {
        if (rand() > 0.55) continue;
        const t = s / steps;
        const cx = a.x + (b.x - a.x) * t;
        const cz = a.z + (b.z - a.z) * t;
        const side = rand() > 0.5 ? 1 : -1;
        const off = halfW + 0.4 + rand() * 1.1;
        const x = cx + nx * off * side;
        const z = cz + nz * off * side;
        // فقط روی خشکِ کرانه، نه داخل آب
        if (isInWater(x, z)) continue;
        if (getGroundHeight(x, z) < WATER_LEVEL + 0.15) continue;
        list.push({ x, z, scale: 0.8 + rand() * 0.5, rotation: rand() * Math.PI * 2 });
      }
    }
    return list;
  }, []);

  if (!items.length) return null;

  return (
    <InstancedGLB
      url={modelUrl('undergrowth.cattail')}
      items={items}
      targetHeight={1.5}
      groundAlign
    />
  );
}

export default function Paths() {
  return (
    <group>
      <DirtPaths />
      <Bridge />
      <SteppingStones />
      <RiverCattails />
    </group>
  );
}
