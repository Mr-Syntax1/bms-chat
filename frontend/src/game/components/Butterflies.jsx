import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CAMP_RADIUS, SAND_START_X, QUEST_SPOTS } from '../sceneLayout';
import { useQualityPreset } from '../stores/useSettingsStore';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// یک جفت بال ساده؛ انیمیشن بال با shader (بدون آپدیت CPU هر پروانه)
function makeWingGeometry() {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array([
    0, 0, 0,
    0.11, 0.06, 0,
    0.02, 0.13, 0,
    0, 0, 0,
    -0.11, 0.06, 0,
    -0.02, 0.13, 0,
  ]);
  const uvs = new Float32Array([0, 0, 1, 0, 0.5, 1, 0, 0, 1, 0, 0.5, 1]);
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

const COLORS = ['#ffd166', '#ff9ecd', '#9ad0ff', '#ffe6a8', '#c9a6ff'];

/**
 * پروانه‌های نزدیک گل‌ها.
 * مسیر پرواز با توابع مثلثاتی در shader محاسبه می‌شود تا هزینه‌ی CPU صفر باشد.
 */
export default function Butterflies({ count = 12 }) {
  const preset = useQualityPreset();
  const meshRef = useRef(null);
  const materialRef = useRef(null);

  const total = preset.butterflies === 0 ? 0 : Math.min(count, preset.butterflies);
  const geometry = useMemo(() => makeWingGeometry(), []);

  const instances = useMemo(() => {
    if (!total) return [];
    const rand = mulberry32(4711);
    const flowers = QUEST_SPOTS.collectibles;
    const list = [];
    for (let i = 0; i < total; i += 1) {
      // نیمی نزدیک گل‌ها، نیمی پراکنده در جنگل
      let x;
      let z;
      if (i % 2 === 0 && flowers.length) {
        const f = flowers[i % flowers.length];
        x = f.x + (rand() - 0.5) * 8;
        z = f.z + (rand() - 0.5) * 8;
      } else {
        x = -50 + rand() * 80;
        z = -50 + rand() * 100;
      }
      if (Math.hypot(x, z) < CAMP_RADIUS - 4) x += 12;
      if (x > SAND_START_X) x = SAND_START_X - 6;
      list.push({
        x,
        z,
        y: 0.5 + rand() * 1.5,
        phase: rand() * Math.PI * 2,
        speed: 0.25 + rand() * 0.35,
        radius: 1.2 + rand() * 2.4,
        scale: 0.7 + rand() * 0.7,
        color: COLORS[Math.floor(rand() * COLORS.length)],
      });
    }
    return list;
  }, [total]);

  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  // ماتریس پایه هر پروانه یک‌بار ست می‌شود؛ حرکت در shader است
  const matrices = useMemo(() => {
    const dummy = new THREE.Object3D();
    return instances.map((b) => {
      dummy.position.set(b.x, b.y, b.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(b.scale);
      dummy.updateMatrix();
      return dummy.matrix.clone();
    });
  }, [instances]);

  const colors = useMemo(() => {
    const arr = new Float32Array(Math.max(1, instances.length) * 3);
    const c = new THREE.Color();
    instances.forEach((b, i) => {
      c.set(b.color);
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    });
    return arr;
  }, [instances]);

  const phaseAttr = useMemo(() => {
    const arr = new Float32Array(Math.max(1, instances.length) * 3);
    instances.forEach((b, i) => {
      arr[i * 3] = b.phase;
      arr[i * 3 + 1] = b.speed;
      arr[i * 3 + 2] = b.radius;
    });
    return arr;
  }, [instances]);

  const colorAttr = useMemo(() => new THREE.InstancedBufferAttribute(colors, 3), [colors]);
  const phaseBuffer = useMemo(() => new THREE.InstancedBufferAttribute(phaseAttr, 3), [phaseAttr]);

  const baseGeo = useMemo(() => {
    const g = geometry.clone();
    g.setAttribute('aPhase', phaseBuffer);
    g.setAttribute('aColor', colorAttr);
    return g;
  }, [geometry, phaseBuffer, colorAttr]);

  useFrame(({ clock }) => {
    // با خاموش بودن انیمیشن محیط، زمان شیدر جلو نمی‌رود (پروانه‌ها ثابت می‌مانند)
    if (materialRef.current && preset.envAnimation) {
      materialRef.current.uniforms.uTime.value = clock.elapsedTime;
    }
  });

  // ماتریس‌ها فقط وقتی فهرست عوض شود
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [matrices]);

  if (!instances.length) return null;

  return (
    <instancedMesh ref={meshRef} args={[baseGeo, undefined, instances.length]} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        vertexShader={`
          uniform float uTime;
          attribute vec3 aPhase;   // phase, speed, radius
          attribute vec3 aColor;
          varying vec3 vColor;
          varying vec2 vUv;
          void main() {
            float phase = aPhase.x;
            float speed = aPhase.y;
            float radius = aPhase.z;
            float t = uTime * speed + phase;

            // مسیر پرواز: دایره‌ی نامنظم + بالا/پایین
            vec3 offset = vec3(
              sin(t) * radius,
              sin(t * 1.7 + phase) * 0.35,
              cos(t * 0.8 + phase) * radius
            );

            // بال زدن: حول محور Z محلی، فقط بال‌ها (|x| > 0)
            vec3 local = position;
            float flap = sin(uTime * 12.0 + phase * 3.0) * 0.85;
            local.y += abs(local.x) * flap;

            vec4 world = instanceMatrix * vec4(local, 1.0);
            world.xyz += offset;

            vColor = aColor;
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * world;
          }
        `}
        fragmentShader={`
          varying vec3 vColor;
          varying vec2 vUv;
          void main() {
            // درخشش ملایم لبه‌ها
            float glow = smoothstep(0.0, 0.35, vUv.y);
            vec3 color = vColor * (0.65 + glow * 0.55);
            gl_FragColor = vec4(color, 0.85);
          }
        `}
      />
    </instancedMesh>
  );
}
