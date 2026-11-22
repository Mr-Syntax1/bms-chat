import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CAMP_RADIUS, SAND_START_X, VAN, SPAWN, FIRE_KEEPOUT } from '../sceneLayout';
import { useQualityPreset } from '../stores/useSettingsStore';

// مولد عدد با seed ثابت
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BASE_COUNT = 6000;

// یک تیغه‌ی علف ساده (۳ ضلعی) — یک draw call برای کل مزرعه
function makeBladeGeometry() {
  const geo = new THREE.BufferGeometry();
  const w = 0.045;
  const h = 0.42;
  const positions = new Float32Array([
    -w, 0, 0,
    w, 0, 0,
    0, h, 0.02,
    -w * 0.6, 0, 0.04,
    w * 0.6, 0, 0.04,
    0, h * 0.72, 0.06,
  ]);
  const normals = new Float32Array(18);
  for (let i = 0; i < 6; i += 1) {
    normals[i * 3] = 0;
    normals[i * 3 + 1] = 1;
    normals[i * 3 + 2] = 0.2;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.computeBoundingSphere();
  return geo;
}

/**
 * علف‌های جنگل با InstancedMesh.
 * حرکت با shader یکپارچه انجام می‌شود تا هیچ آپدیت per-instance در CPU نباشد.
 * (فقط حرکت بصری — هیچ صدای بادی وجود ندارد)
 */
export default function GrassField() {
  const preset = useQualityPreset();
  const meshRef = useRef(null);
  const materialRef = useRef(null);

  const count = Math.floor(BASE_COUNT * preset.grassDensity);
  const geometry = useMemo(() => makeBladeGeometry(), []);

  const matrices = useMemo(() => {
    if (!count) return [];
    const rand = mulberry32(918273);
    const dummy = new THREE.Object3D();
    const list = [];
    let guard = 0;

    while (list.length < count && guard < count * 12) {
      guard += 1;
      const x = -92 + rand() * 118; // فقط سمت جنگل (x < 26)
      const z = -92 + rand() * 184;

      // کمپ مرکزی، ون، نقطه‌ی اسپاون و گودال آتش بدون علف
      if (Math.hypot(x, z) < CAMP_RADIUS - 2) continue;
      if (Math.hypot(x - VAN.x, z - VAN.z) < 4.4) continue;
      if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 2.6) continue;
      if (Math.hypot(x, z) < FIRE_KEEPOUT + 2) continue;
      // مسیر باز کمپ→اسکله
      if (Math.abs(z) < 3.2 && x > 6 && x < SAND_START_X) continue;

      dummy.position.set(x, 0.01, z);
      dummy.rotation.set(0, rand() * Math.PI * 2, 0);
      const s = 0.7 + rand() * 0.9;
      dummy.scale.set(s, s * (0.75 + rand() * 0.6), s);
      dummy.updateMatrix();
      list.push(dummy.matrix.clone());
    }
    return list;
  }, [count]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || !matrices.length) return;
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [matrices]);

  // زمان شیدر برای حرکت نرم برگ‌ها (بدون CPU)
  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.elapsedTime;
    }
  });

  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uSway: { value: 1 } }), []);

  if (!matrices.length) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, matrices.length]}
      frustumCulled
      receiveShadow={false}
      castShadow={false}
    >
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        side={THREE.DoubleSide}
        transparent={false}
        vertexShader={`
          uniform float uTime;
          uniform float uSway;
          varying float vH;
          void main() {
            // موقعیت محلی تیغه + افست هر instance (برای فاز مستقل حرکت)
            vec3 local = position;
            float phase = instanceMatrix[3].x * 0.35 + instanceMatrix[3].z * 0.28;
            // فقط نوک تیغه خم می‌شود (در فضای محلی، پیش از scale)
            float bend = local.y * local.y * 0.55 * uSway;
            local.x += sin(uTime * 1.4 + phase) * bend;
            local.z += cos(uTime * 1.1 + phase * 1.3) * bend * 0.7;

            vec4 world = instanceMatrix * vec4(local, 1.0);
            vH = position.y;
            gl_Position = projectionMatrix * modelViewMatrix * world;
          }
        `}
        fragmentShader={`
          varying float vH;
          void main() {
            vec3 base = vec3(0.176, 0.290, 0.208);
            vec3 tip = vec3(0.365, 0.545, 0.396);
            vec3 color = mix(base, tip, clamp(vH * 2.6, 0.0, 1.0));
            gl_FragColor = vec4(color, 1.0);
          }
        `}
      />
    </instancedMesh>
  );
}
