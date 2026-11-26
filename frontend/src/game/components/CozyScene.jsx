import { useMemo, useRef, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import Ground, { AmbientSetup } from './Ground';
import Forest, { BackdropForest } from './Forest';
import Campfire from './Campfire';
import Van from './Van';
import Decorations from './Decorations';
import Beach from './Beach';
import CampDecor from './CampDecor';
import QuestItems from './QuestItems';
import AmbientAudio from './AmbientAudio';
import GrassField from './GrassField';
import Butterflies from './Butterflies';
import Waterfall from './Waterfall';
import Paths from './Paths';
import PondLife from './PondLife';
import Weather from './Weather';
import CanopyFX from './CanopyFX';
import CookingStation from './CookingStation';
import FishingSpot from './FishingBobber';
import Wildlife from './Wildlife';
import Bugs from './Bugs';
import ForageItems from './ForageItems';
import { FISHING_SPOTS } from '../fishingSpots';
import { useQualityPreset, useSettingsStore } from '../stores/useSettingsStore';
import { usePlayerStore } from '../stores/usePlayerStore';
import { updateEnvState, skyColorsFor, weatherFogFor } from '../envState';

// مدت یک چرخه‌ی کامل روز/شب (ثانیه) — ۰ = بدون حرکت (کیفیت کم)
const DAY_LENGTH = 420;

// کرم شب‌تاب
function Fireflies({ count }) {
  return (
    <Sparkles
      count={count}
      scale={[30, 5, 30]}
      position={[0, 1.6, 0]}
      size={3.6}
      speed={0.22}
      opacity={0.55}
      color="#ffe07a"
      noise={1.4}
    />
  );
}

// آسمان: گرادیان عمودی که با چرخه‌ی روز/شب تغییر می‌کند
function DayNightSky({ animate }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          topColor: { value: new THREE.Color('#171426') },
          bottomColor: { value: new THREE.Color('#22334d') },
          offset: { value: 12 },
          exponent: { value: 0.7 },
        },
        vertexShader: `
          varying vec3 vWorldPosition;
          void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 topColor;
          uniform vec3 bottomColor;
          uniform float offset;
          uniform float exponent;
          varying vec3 vWorldPosition;
          void main() {
            float h = normalize(vWorldPosition + offset).y;
            gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
          }
        `,
      }),
    []
  );

  // هر ۲۰ فریم یک‌بار رنگ‌ها را تازه می‌کند (به‌جای هر فریم)
  const tick = useRef(0);
  useFrame(({ clock }) => {
    if (!animate) return;
    tick.current += 1;
    if (tick.current % 20 !== 0) return;
    const phase = updateEnvState(clock.elapsedTime / DAY_LENGTH).phase;
    const { top, bottom } = skyColorsFor(phase);
    material.uniforms.topColor.value.setRGB(top[0], top[1], top[2]);
    material.uniforms.bottomColor.value.setRGB(bottom[0], bottom[1], bottom[2]);
  });

  return (
    <mesh material={material}>
      <sphereGeometry args={[300, 32, 16]} />
    </mesh>
  );
}

// ستاره‌های اضافی: هندسه‌ی Points سبک با چرخش آرام (بدون shader پروفریم)
function Starfield({ count = 2000, animate = true }) {
  const ref = useRef(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    // مولد شبه‌تصادفی با seed ثابت (بدون Math.random در رندر)
    let seed = 1337;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let i = 0; i < count; i += 1) {
      const u = rand();
      const v = rand();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 220 + rand() * 60;
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * 0.9 + 10;
      arr[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if (animate && ref.current) ref.current.rotation.y += delta * 0.008;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#dfe9ff"
        size={1.15}
        sizeAttenuation
        transparent
        opacity={0.82}
        depthWrite={false}
        fog={false}
      />
    </points>
  );
}

// ماه: کره‌ی درخشان با هاله‌ی نرم + نور نقطه‌ای برای روشن کردن آسمان اطراف
function Moon() {
  const haloRef = useRef(null);
  const coreRef = useRef(null);

  // هاله نبض بسیار آرام دارد تا ماه «زنده» به نظر برسد
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (haloRef.current) {
      const s = 1 + Math.sin(t * 0.35) * 0.012;
      haloRef.current.scale.setScalar(s);
      haloRef.current.material.opacity = 0.12 + Math.sin(t * 0.6) * 0.02;
    }
    void coreRef;
  });

  return (
    <group position={[-90, 110, -120]}>
      <mesh>
        <sphereGeometry args={[9, 32, 32]} />
        <meshStandardMaterial
          color="#f7f6ee"
          emissive="#ffffee"
          emissiveIntensity={1.5}
          roughness={0.92}
          metalness={0}
          fog={false}
        />
      </mesh>
      <mesh ref={haloRef}>
        <sphereGeometry args={[12.6, 24, 24]} />
        <meshBasicMaterial color="#cfd9f5" transparent opacity={0.13} depthWrite={false} fog={false} />
      </mesh>
      <pointLight color="#c8d8ff" intensity={70} distance={300} decay={1.5} />
    </group>
  );
}

// ابرهای ساده
function LowPolyClouds({ animate = true }) {
  const groupRef = useRef(null);

  const clouds = useMemo(
    () => [
      { position: [16, 26, -26], scale: 1.5, drift: 0.35 },
      { position: [-24, 30, -14], scale: 1.9, drift: 0.22 },
      { position: [4, 34, -38], scale: 1.2, drift: 0.45 },
    ],
    []
  );

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group || !animate) return;
    group.children.forEach((cloud, i) => {
      cloud.position.x = clouds[i].position[0] + Math.sin(clock.elapsedTime * 0.05 * clouds[i].drift) * 6;
    });
  });

  return (
    <group ref={groupRef}>
      {clouds.map((cloud, i) => (
        <group key={i} position={cloud.position} scale={cloud.scale}>
          <mesh>
            <icosahedronGeometry args={[2.4, 1]} />
            <meshStandardMaterial color="#8fa4c9" transparent opacity={0.16} depthWrite={false} />
          </mesh>
          <mesh position={[2.2, -0.3, 0.6]} scale={0.8}>
            <icosahedronGeometry args={[2.1, 1]} />
            <meshStandardMaterial color="#7e93ba" transparent opacity={0.14} depthWrite={false} />
          </mesh>
          <mesh position={[-2.1, -0.4, -0.4]} scale={0.7}>
            <icosahedronGeometry args={[1.9, 1]} />
            <meshStandardMaterial color="#96aad0" transparent opacity={0.13} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export default function CozyScene() {
  const preset = useQualityPreset();
  const weather = useSettingsStore((s) => s.weather);
  // کمپ شلوغ (۳+ نفر) کرم‌شب‌تاب بیشتری روشن می‌کند
  const crowded = usePlayerStore((s) => s.peerCount >= 3);
  const fireflyCount = Math.round(preset.fireflies * (crowded ? 1.5 : 1));
  const fogRef = useRef(null);
  const bgRef = useRef(null);

  // مه و رنگ پس‌زمینه با چرخه‌ی روز/شب هماهنگ می‌شوند (هر ۲۰ فریم)
  const tick = useRef(0);
  useFrame(({ clock }) => {
    // حتی با انیمیشن خاموش، باران باید مه را تغییر دهد
    if (!preset.envAnimation && weather !== 'rain') return;
    tick.current += 1;
    if (tick.current % 20 !== 0) return;
    const env = updateEnvState(clock.elapsedTime / DAY_LENGTH);
    const rainMod = weatherFogFor(weather);
    if (fogRef.current) {
      fogRef.current.near = env.fogNear * (rainMod?.nearMul ?? 1);
      fogRef.current.far = env.fogFar * (rainMod?.farMul ?? 1);
    }
    if (bgRef.current) {
      const { bottom } = skyColorsFor(env.phase);
      bgRef.current.setRGB(bottom[0] * 0.32, bottom[1] * 0.34, bottom[2] * 0.4);
    }
  });

  return (
    <>
      <color ref={bgRef} attach="background" args={['#070d1c']} />
      {/* مه نازک آبی تیره برای حس cozy */}
      <fog ref={fogRef} attach="fog" args={['#101c30', 30, 150]} />

      <DayNightSky animate={preset.envAnimation} />
      <Stars radius={120} depth={60} count={preset.particles > 0.5 ? 2200 : 1100} factor={3.6} saturation={0} fade speed={preset.envAnimation ? 0.4 : 0} />
      <Starfield count={preset.particles > 0.5 ? 2000 : 900} animate={preset.envAnimation} />
      <Moon />
      <LowPolyClouds animate={preset.envAnimation} />

      <AmbientSetup />

      <Ground />
      <Forest />
      <BackdropForest />
      <Waterfall />
      <Paths />
      <PondLife />
      <Decorations />
      <CampDecor />
      <GrassField />
      <Beach />
      <Campfire />
      <Van />
      {/* هر ایستگاه/آیتم مرز Suspense مستقل دارد؛ وگرنه لود شدن یک مدل
          (مثلاً غذای روی ایستگاه) کل صحنه را unmount و دوباره می‌ساخت
          و بازی چند ثانیه فریز می‌شد. */}
      <Suspense fallback={null}>
        <CookingStation id="grill" />
        <CookingStation id="pot" />
        <CookingStation id="cauldron" />
        <CookingStation id="pan" />
      </Suspense>
      <Suspense fallback={null}>
        {FISHING_SPOTS.map((spot, i) => (
          <FishingSpot key={`fish-${i}`} index={i} spot={spot} />
        ))}
      </Suspense>
      <Suspense fallback={null}>
        <QuestItems />
      </Suspense>
      <CanopyFX />
      <Suspense fallback={null}>
        <Wildlife />
      </Suspense>
      <Suspense fallback={null}>
        <Bugs />
      </Suspense>
      <Suspense fallback={null}>
        <ForageItems />
      </Suspense>
      <Weather />
      <Fireflies count={fireflyCount} />
      <Butterflies count={preset.butterflies} />

      <AmbientAudio />

      {/* پست‌پروسسینگ فقط وقتی کیفیت اجازه بدهد */}
      {preset.bloom || preset.vignette ? (
        <EffectComposer multisampling={0}>
          {preset.bloom && (
            <Bloom intensity={0.55} luminanceThreshold={0.62} luminanceSmoothing={0.28} mipmapBlur />
          )}
          {preset.vignette && <Vignette eskil={false} offset={0.32} darkness={0.72} />}
        </EffectComposer>
      ) : null}
    </>
  );
}
