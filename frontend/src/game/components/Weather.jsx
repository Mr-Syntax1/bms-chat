import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSettingsStore, useQualityPreset } from '../stores/useSettingsStore';
import { createGlobalLoop } from '../audio';
import { RAIN_SOUND } from '../sounds';

// ---------------------------------------------------------------------------
// باران ملایم: ذرات خط‌شکل که دور دوربین می‌بارند + بانک‌های مه در جنگل.
// تعداد ذرات از preset می‌آید (low = خاموش).
// ---------------------------------------------------------------------------
const RAIN_COUNT = { low: 0, medium: 420, high: 900 };

// کش ماژول‌سطح: هندسه و پارامترها یک‌بار ساخته می‌شوند و در useFrame فقط
// بافر موقعیت (که خودش را در جای خود می‌نویسد) تغییر می‌کند.
const rainCache = new Map();

function getRainData(count) {
  const cached = rainCache.get(count);
  if (cached) return cached;

  const positions = new Float32Array(count * 6); // هر قطره = ۲ رأس (خط)
  const speeds = new Float32Array(count);

  let seed = 909090;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let i = 0; i < count; i += 1) {
    const x = (rand() - 0.5) * 46;
    const y = rand() * 26;
    const z = (rand() - 0.5) * 46;
    const len = 0.55 + rand() * 0.5;
    positions[i * 6] = x;
    positions[i * 6 + 1] = y;
    positions[i * 6 + 2] = z;
    positions[i * 6 + 3] = x + 0.08;
    positions[i * 6 + 4] = y - len;
    positions[i * 6 + 5] = z;
    speeds[i] = 14 + rand() * 10;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.computeBoundingSphere();

  const data = { geo, speeds };
  rainCache.set(count, data);
  return data;
}

function Rain({ count }) {
  const { camera } = useThree();
  const data = getRainData(count);
  const lineRef = useRef(null);

  useFrame((_, rawDelta) => {
    const line = lineRef.current;
    if (!line) return;
    const delta = Math.min(rawDelta, 0.05);
    const attr = line.geometry.attributes.position;
    const positions = attr.array;
    const speeds = data.speeds;
    const n = speeds.length;

    for (let i = 0; i < n; i += 1) {
      const base = i * 6;
      const fall = speeds[i] * delta;
      positions[base + 1] -= fall;
      positions[base + 4] -= fall;
      if (positions[base + 1] < -2) {
        // بازچرخانی به بالای آسمان
        const len = positions[base + 1] - positions[base + 4];
        positions[base + 1] = 24;
        positions[base + 4] = 24 - Math.abs(len);
      }
    }

    // ابر باران دور دوربین می‌چرخد تا هرگز از آن بیرون نزند
    line.position.x = camera.position.x;
    line.position.z = camera.position.z;
    line.position.y = 0;

    attr.needsUpdate = true;
  });

  if (!count) return null;

  return (
    <lineSegments ref={lineRef} geometry={data.geo} frustumCulled={false}>
      <lineBasicMaterial color="#9fc4dd" transparent opacity={0.32} depthWrite={false} />
    </lineSegments>
  );
}

// ---------------------------------------------------------------------------
// بانک‌های مه: چند دیسک شفاف که آرام می‌چرخند (فقط کیفیت متوسط/زیاد)
// ---------------------------------------------------------------------------
const FOG_BANKS = [
  { x: -30, y: 1.1, z: -20, r: 16, speed: 0.012 },
  { x: -58, y: 1.4, z: -30, r: 20, speed: -0.008 },
  { x: 24, y: 0.9, z: 14, r: 14, speed: 0.016 },
  { x: -70, y: 2.0, z: 26, r: 22, speed: -0.006 },
];

function FogBanks({ animate }) {
  const refs = useRef([]);

  useFrame(({ clock }) => {
    if (!animate) return;
    const t = clock.elapsedTime;
    refs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const bank = FOG_BANKS[i];
      mesh.rotation.z = t * bank.speed;
      mesh.position.x = bank.x + Math.sin(t * 0.05 + i) * 4;
      mesh.material.opacity = 0.1 + Math.sin(t * 0.2 + i * 1.7) * 0.035;
    });
  });

  return (
    <group>
      {FOG_BANKS.map((bank, i) => (
        <mesh
          key={i}
          ref={(node) => {
            refs.current[i] = node;
          }}
          position={[bank.x, bank.y, bank.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[bank.r, 24]} />
          <meshBasicMaterial
            color="#c8dcec"
            transparent
            opacity={0.11}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// صدای باران: حلقه‌ی غیرمکانی (synth تا فایل واقعی برسد)
// ---------------------------------------------------------------------------
function useRainAudio(active) {
  useEffect(() => {
    if (!active) return undefined;
    const loop = createGlobalLoop(RAIN_SOUND, {
      volume: 0.4,
      channel: 'ambient',
      synth: 'rain',
    });
    return () => loop.dispose();
  }, [active]);
}

export default function Weather() {
  const preset = useQualityPreset();
  const weather = useSettingsStore((s) => s.weather);
  const tier = preset.treeDensity > 700 ? 'high' : preset.treeDensity > 500 ? 'medium' : 'low';
  const raining = weather === 'rain';
  const count = raining ? RAIN_COUNT[tier] : 0;

  useRainAudio(raining && count > 0);

  return (
    <group>
      {raining && <Rain count={count} />}
      {tier !== 'low' && <FogBanks animate={preset.envAnimation} />}
    </group>
  );
}
