import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useQualityPreset } from '../stores/useSettingsStore';
import { usePlayerStore } from '../stores/usePlayerStore';
import { getGroundHeight } from '../terrain';
import { PARTICLE_BUDGET } from '../fxBudget';

// ---------------------------------------------------------------------------
// حس تاج جنگل: گرده‌های شناور و برگ‌های در حال ریزش.
//
//  ⚠️ ستون‌های نور (light shafts / god rays) کاملاً حذف شدند — آن‌ها همان
//  «مخروط‌های نور معلق در هوا»ی اسکرین‌شات ۲ بودند.
//  ⚠️ تعداد برگ‌ها و گرده‌ها از سقف جهانی ذرات (PARTICLE_BUDGET) می‌آید، نه
//  per-preset — قبلاً گرده‌ها تا ۷۰ عدد می‌رفتند و سقف ۵۰ را می‌شکستند.
// ---------------------------------------------------------------------------
const POLLEN_COUNT = PARTICLE_BUDGET.pollen;

export function Pollen({ count }) {
  const ref = useRef(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    let seed = 424242;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let i = 0; i < count; i += 1) {
      const x = (rand() - 0.5) * 60;
      const z = (rand() - 0.5) * 60;
      arr[i * 3] = x;
      arr[i * 3 + 1] = getGroundHeight(x, z) + 0.8 + rand() * 5;
      arr[i * 3 + 2] = z;
    }
    return arr;
  }, [count]);

  const base = useMemo(() => positions.slice(), [positions]);

  useFrame(({ clock }) => {
    const points = ref.current;
    if (!points) return;
    const t = clock.elapsedTime;
    const attr = points.geometry.attributes.position;
    const arr = attr.array;
    for (let i = 0; i < count; i += 1) {
      const i3 = i * 3;
      // شناوری آرام با فاز یکتا برای هر ذره
      arr[i3] = base[i3] + Math.sin(t * 0.22 + i) * 0.35;
      arr[i3 + 1] = base[i3 + 1] + Math.sin(t * 0.31 + i * 1.3) * 0.5;
      arr[i3 + 2] = base[i3 + 2] + Math.cos(t * 0.19 + i * 0.7) * 0.35;
    }
    attr.needsUpdate = true;
  });

  if (!count) return null;

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#ffe9ad"
        size={0.075}
        sizeAttenuation
        transparent
        opacity={0.7}
        depthWrite={false}
      />
    </points>
  );
}

// برگ‌های در حال ریزش: صفحه‌های کوچک که آرام می‌چرخند و می‌افتند
function FallingLeaves({ count }) {
  const meshRef = useRef(null);

  const data = useMemo(() => {
    const list = [];
    let seed = 777333;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let i = 0; i < count; i += 1) {
      const x = (rand() - 0.5) * 50;
      const z = (rand() - 0.5) * 50;
      list.push({
        x,
        z,
        y: getGroundHeight(x, z) + 3 + rand() * 8,
        speed: 0.35 + rand() * 0.4,
        sway: 0.3 + rand() * 0.6,
        phase: rand() * Math.PI * 2,
        spin: (rand() - 0.5) * 1.6,
        scale: 0.09 + rand() * 0.07,
      });
    }
    return list;
  }, [count]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || !data.length) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    data.forEach((leaf, i) => {
      dummy.position.set(leaf.x, leaf.y, leaf.z);
      dummy.scale.setScalar(leaf.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      color.setHSL(0.13 + (i % 5) * 0.03, 0.5, 0.4 + (i % 4) * 0.05);
      mesh.setColorAt(i, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [data]);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < data.length; i += 1) {
      const leaf = data[i];
      const ground = getGroundHeight(leaf.x, leaf.z);
      const span = leaf.y - ground;
      // چرخه‌ی ریزش: از بالا تا زمین و تکرار
      const fall = ((t * leaf.speed + leaf.phase) % 1);
      const y = leaf.y - fall * span;
      dummy.position.set(
        leaf.x + Math.sin(t * 0.8 + leaf.phase) * leaf.sway,
        y,
        leaf.z + Math.cos(t * 0.7 + leaf.phase) * leaf.sway
      );
      dummy.rotation.set(t * leaf.spin, t * leaf.spin * 0.6, leaf.phase);
      dummy.scale.setScalar(leaf.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (!data.length) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, data.length]} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial side={THREE.DoubleSide} transparent opacity={0.85} depthWrite={false} />
    </instancedMesh>
  );
}

export default function CanopyFX() {
  const preset = useQualityPreset();
  // کمپ شلوغ (۳+ نفر) گرده‌ی بیشتری نشان می‌دهد، ولی برگ‌ها سقف جهانی دارند
  const crowded = usePlayerStore((s) => s.peerCount >= 3);
  const tier = preset.treeDensity > 700 ? 'high' : preset.treeDensity > 500 ? 'medium' : 'low';

  if (tier === 'low') return null;

  const crowdMul = crowded ? 1.4 : 1;
  const leafCount = PARTICLE_BUDGET.leaves;
  const pollenCount = Math.min(PARTICLE_BUDGET.pollen, Math.round(POLLEN_COUNT * crowdMul));

  return (
    <group>
      <Pollen count={pollenCount} />
      <FallingLeaves count={leafCount} />
    </group>
  );
}
