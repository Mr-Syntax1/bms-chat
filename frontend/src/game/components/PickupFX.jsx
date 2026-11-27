import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { pickupEvents, advancePickup } from '../pickupFX';
import { PARTICLE_BUDGET } from '../fxBudget';

const LIFE = 0.75;
// بودجه‌ی جهانی این سیستم = PARTICLE_BUDGET.pickup (۸ ذره).
// تعداد هر انفجار طوری انتخاب می‌شود که مجموع از سقف رد نشود.
const PER_SLOT = Math.max(1, Math.floor(PARTICLE_BUDGET.pickup / pickupEvents.slots.length));
const TOTAL = pickupEvents.slots.length * PER_SLOT;

// جهت‌های ثابت ذرات (یک‌بار ساخته می‌شود، بدون alloc در فریم)
function makeOffsets() {
  const arr = new Float32Array(TOTAL * 3);
  let seed = 24680;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  for (let i = 0; i < TOTAL; i += 1) {
    const theta = rand() * Math.PI * 2;
    const phi = rand() * Math.PI;
    arr[i * 3] = Math.sin(phi) * Math.cos(theta);
    arr[i * 3 + 1] = Math.abs(Math.cos(phi)) * 0.8 + 0.4;
    arr[i * 3 + 2] = Math.sin(phi) * Math.sin(theta);
  }
  return arr;
}

/**
 * انفجار ذرات برداشت — یک InstancedMesh با pool ثابت.
 * خواندن صف ماژول‌سطح pickupFX و نوشتن ماتریس‌ها بدون re-render.
 */
export default function PickupFX() {
  const ref = useRef(null);
  const offsets = useMemo(() => makeOffsets(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  // ماتریس‌ها/رنگ‌ها را از ابتدا مقداردهی می‌کنیم تا instanceColor ساخته شود
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    const white = new THREE.Color('#ffffff');
    for (let i = 0; i < TOTAL; i += 1) {
      mesh.setMatrixAt(i, zero);
      mesh.setColorAt(i, white);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);

  useFrame((_, rawDelta) => {
    const mesh = ref.current;
    if (!mesh) return;
    const delta = Math.min(rawDelta, 0.1);
    advancePickup(delta);

    const slots = pickupEvents.slots;
    let idx = 0;
    for (let s = 0; s < slots.length; s += 1) {
      const slot = slots[s];
      for (let p = 0; p < PER_SLOT; p += 1) {
        if (slot.active) {
          const life = slot.t / LIFE;
          const spread = 0.25 + life * 1.1;
          const o = (s * PER_SLOT + p) * 3;
          const px = slot.x + offsets[o] * spread;
          const py = slot.y + offsets[o + 1] * spread * 0.9 + life * 0.5;
          const pz = slot.z + offsets[o + 2] * spread;
          const scale = Math.max(0, 0.14 * (1 - life));
          dummy.position.set(px, py, pz);
          dummy.scale.setScalar(scale);
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          mesh.setMatrixAt(idx, dummy.matrix);
          color.set(slot.color);
          mesh.setColorAt(idx, color);
          dummy.scale.setScalar(0);
        } else {
          dummy.scale.setScalar(0);
          dummy.updateMatrix();
          mesh.setMatrixAt(idx, dummy.matrix);
        }
        idx += 1;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, TOTAL]} frustumCulled={false} dispose={null}>
      <sphereGeometry args={[1, 5, 4]} />
      <meshBasicMaterial toneMapped={false} transparent opacity={0.95} depthWrite={false} />
    </instancedMesh>
  );
}
