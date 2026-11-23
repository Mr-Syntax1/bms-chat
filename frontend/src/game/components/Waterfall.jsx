import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WATERFALL, WATER_LEVEL, getWaterfallTopY } from '../terrain';
import { useQualityPreset } from '../stores/useSettingsStore';

const TOP_Y = getWaterfallTopY();
const HEIGHT = Math.max(1, TOP_Y - WATERFALL.bottomY);
const CENTER_Y = (TOP_Y + WATERFALL.bottomY) * 0.5;
// صفحه‌ی آبشار در نیمه‌ی راه بین لبه‌ی دیواره و محل فرود قرار می‌گیرد
const SHEET_Z = (WATERFALL.wallZ + WATERFALL.baseZ) * 0.5;

// ---------------------------------------------------------------------------
// آبشار: صفحه‌ی شیدری عمودی در شکاف صخره + استخر فوم + پرده‌ی پاشش
// ---------------------------------------------------------------------------
const FALL_VERTEX = `
  uniform float uTime;
  uniform float uLength;
  varying vec2 vUv;
  varying float vFoam;
  void main() {
    vUv = uv;
    vec3 p = position;
    // نوار آب کمی به بیرون خم می‌شود (مسیر سهمی)
    float t = uv.y; // ۰ پایین، ۱ بالا
    p.z += (1.0 - t) * (1.0 - t) * uLength * 0.14;
    // لرزش افقی فزاینده به سمت پایین
    p.x += sin(uv.y * 18.0 + uTime * 3.4) * 0.05 * (1.0 - t);
    vFoam = (1.0 - t);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FALL_FRAGMENT = `
  uniform float uTime;
  uniform vec3 uWater;
  uniform vec3 uFoamColor;
  varying vec2 vUv;
  varying float vFoam;
  void main() {
    // رگه‌های عمودی آب
    float streak = sin(vUv.x * 46.0 + uTime * 3.1) * 0.5 + 0.5;
    float streak2 = sin(vUv.x * 71.0 - uTime * 5.3 + vUv.y * 9.0) * 0.5 + 0.5;
    float flow = sin(vUv.y * 12.0 - uTime * 8.5) * 0.5 + 0.5;

    vec3 color = uWater;
    color += (streak * streak2 * 0.28 + flow * 0.12) * vec3(0.62, 0.82, 0.88);

    // فوم: پایین آبشار و لبه‌های کناری
    float edge = smoothstep(0.5, 0.24, abs(vUv.x - 0.5) * 2.0);
    float bottom = smoothstep(0.42, 0.0, vUv.y);
    float foam = clamp(vFoam * 1.5 * (1.0 - edge * 0.3) + bottom * 1.1, 0.0, 1.0);
    color = mix(color, uFoamColor, foam * 0.72);

    float alpha = 0.62 + foam * 0.36;
    gl_FragColor = vec4(color, alpha);
  }
`;

// uniform مشترک در سطح ماژول (بدون re-render)
const FALL_UNIFORMS = {
  uTime: { value: 0 },
  uLength: { value: HEIGHT },
  uWater: { value: new THREE.Color('#4a8fa3') },
  uFoamColor: { value: new THREE.Color('#e2f2f4') },
};

function WaterfallSheet({ animate }) {
  useFrame(({ clock }) => {
    FALL_UNIFORMS.uTime.value = animate ? clock.elapsedTime : 0;
  });

  const height = HEIGHT;
  const centerY = CENTER_Y;

  return (
    <group position={[WATERFALL.x, centerY, SHEET_Z]} rotation={[0.12, 0, 0]}>
      <mesh>
        <planeGeometry args={[WATERFALL.width, height, 1, 12]} />
        <shaderMaterial
          uniforms={FALL_UNIFORMS}
          vertexShader={FALL_VERTEX}
          fragmentShader={FALL_FRAGMENT}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* لایه‌ی عقب برای ضخامت */}
      <mesh position={[0, 0, -0.28]} scale={[1.12, 1, 1]}>
        <planeGeometry args={[WATERFALL.width, height, 1, 12]} />
        <shaderMaterial
          uniforms={FALL_UNIFORMS}
          vertexShader={FALL_VERTEX}
          fragmentShader={FALL_FRAGMENT}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// استخر فوم پایین آبشار — چند حلقه‌ی شفاف با پالس
function SplashPool({ animate }) {
  const refs = useRef([]);

  const rings = useMemo(
    () =>
      Array.from({ length: 3 }, (_, i) => ({
        radius: 1.5 + i * 1.1,
        offset: i * 0.9,
      })),
    []
  );

  useFrame(({ clock }) => {
    if (!animate) return;
    const t = clock.elapsedTime;
    refs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const phase = (t * 0.55 + rings[i].offset) % 1;
      const s = 0.55 + phase * 1.35;
      mesh.scale.setScalar(s);
      mesh.material.opacity = (1 - phase) * 0.4;
    });
  });

  const y = WATER_LEVEL + 0.03;

  return (
    <group position={[WATERFALL.x, 0, WATERFALL.baseZ + 2.6]}>
      {rings.map((ring, i) => (
        <mesh
          key={i}
          ref={(node) => {
            refs.current[i] = node;
          }}
          position={[0, y, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[ring.radius, ring.radius + 0.5, 40]} />
          <meshBasicMaterial color="#dff0f2" transparent opacity={0.3} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

// ذرات پاشش — InstancedMesh با حرکت رویه‌ای
// مولد شبه‌تصادفی با seed ثابت (بدون Math.random در رندر)
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildSprayData(count) {
  const rand = mulberry32(864213);
  return Array.from({ length: count }, () => ({
    offsetX: (rand() - 0.5) * WATERFALL.width * 1.6,
    offsetZ: (rand() - 0.5) * 2.2,
    speed: 0.55 + rand() * 0.85,
    phase: rand(),
    size: 0.05 + rand() * 0.09,
  }));
}

function SprayParticles({ count }) {
  const meshRef = useRef(null);
  const data = useMemo(() => buildSprayData(count), [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh || !data.length) return;
    const t = clock.elapsedTime;
    const rise = HEIGHT * 0.75;

    data.forEach((p, i) => {
      const cycle = (t * p.speed + p.phase) % 1;
      // از بالا به پایین می‌افتد، سپس محو می‌شود
      const y = WATERFALL.bottomY + (1 - cycle) * rise + Math.sin(cycle * Math.PI) * 0.5;
      const drift = cycle * 1.6;
      dummy.position.set(
        WATERFALL.x + p.offsetX * (1 + cycle * 0.5),
        y,
        WATERFALL.baseZ + 0.9 + p.offsetZ + drift
      );
      const s = p.size * (1 - cycle * 0.6);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (!count) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[1, 6, 4]} />
      <meshBasicMaterial color="#e8f6f8" transparent opacity={0.55} depthWrite={false} />
    </instancedMesh>
  );
}

export default function Waterfall() {
  const preset = useQualityPreset();
  const sprayCount = Math.round(90 * preset.particles);

  return (
    <group>
      <WaterfallSheet animate={preset.envAnimation} />
      <SplashPool animate={preset.envAnimation} />
      <SprayParticles count={sprayCount} />
    </group>
  );
}
