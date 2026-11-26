import '../models/setupDraco';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGLTF, Html } from '@react-three/drei';
import { modelUrl } from '../assetManifest';
import { registerInteractable, registerCookingStation } from '../interactionRegistry';
import { usePlayerStore } from '../stores/usePlayerStore';
import Fitted from '../models/Fitted';
import { STATIONS, cooking, subscribeCooking } from '../recipes';

const POT_URL = modelUrl('cooking.pot');
const CAULDRON_URL = modelUrl('cooking.cauldron');
const PAN_URL = modelUrl('cooking.fryingPan');

[POT_URL, CAULDRON_URL, PAN_URL].filter(Boolean).forEach((url) => useGLTF.preload(url));

// سه‌پایه‌ی چوبی + زنجیر برای دیگ آویزان (tripod.glb موجود نیست → رویه‌ای)
function Tripod({ children }) {
  const sticks = [0, 1, 2].map((i) => {
    const angle = (i / 3) * Math.PI * 2;
    return {
      x: Math.cos(angle) * 0.78,
      z: Math.sin(angle) * 0.78,
      rotZ: Math.cos(angle) * 0.62,
      rotX: -Math.sin(angle) * 0.62,
    };
  });
  return (
    <group>
      {sticks.map((s, i) => (
        <mesh key={i} position={[s.x, 1.1, s.z]} rotation={[s.rotX, 0, s.rotZ]} castShadow>
          <cylinderGeometry args={[0.045, 0.06, 2.4, 6]} />
          <meshStandardMaterial color="#6b4a2f" roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0, 1.55, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.5, 5]} />
        <meshStandardMaterial color="#4a4a52" roughness={0.6} metalness={0.6} />
      </mesh>
      <group position={[0, 1.1, 0]}>{children}</group>
    </group>
  );
}

// بخار ملایم بالای ظرف در حین پخت: چند کره‌ی شفاف که بالا می‌روند و محو
// می‌شوند. فقط یک InstancedMesh؛ هیچ تخصیصی در هر فریم ندارد.
const STEAM_COUNT = 7;

function Steam({ active }) {
  const meshRef = useRef(null);
  const geo = useMemo(() => new THREE.SphereGeometry(0.075, 6, 5), []);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#f4f7fb', transparent: true, opacity: 0.22, depthWrite: false }),
    []
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(
    () =>
      Array.from({ length: STEAM_COUNT }, (_, i) => ({
        a: (i / STEAM_COUNT) * Math.PI * 2,
        r: 0.05 + (i % 3) * 0.05,
        speed: 0.42 + (i % 4) * 0.07,
        offset: i / STEAM_COUNT,
      })),
    []
  );

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    if (!active) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    const t = clock.elapsedTime;
    for (let i = 0; i < STEAM_COUNT; i += 1) {
      const s = seeds[i];
      const life = (t * s.speed + s.offset) % 1;
      const rise = life * 0.85;
      const wobble = Math.sin(t * 1.6 + i) * 0.05;
      dummy.position.set(
        Math.sin(s.a) * s.r + wobble,
        0.06 + rise,
        Math.cos(s.a) * s.r + wobble * 0.7
      );
      dummy.scale.setScalar(0.5 + life * 1.5);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={meshRef} args={[geo, mat, STEAM_COUNT]} visible={false} frustumCulled={false} />;
}

// غذایی که روی ایستگاه دیده می‌شود: در حین پخت + نتیجه‌ی آخر (فقط ایستگاه خودش)
function StationDish({ stationId, height = 0.22 }) {
  const [dish, setDish] = useState(null);
  const spinRef = useRef(null);

  useEffect(
    () =>
      subscribeCooking((type) => {
        if (type === 'start' && cooking.stationId === stationId) {
          setDish(cooking.recipe?.modelKey ? { key: cooking.recipe.modelKey, done: false } : null);
        } else if (type === 'result' && cooking.stationId === stationId) {
          setDish(cooking.result?.modelKey ? { key: cooking.result.modelKey, done: true } : null);
        } else if (type === 'reset') {
          setDish(null);
        }
      }),
    [stationId]
  );

  useFrame(({ clock }) => {
    if (spinRef.current && dish?.done) spinRef.current.rotation.y = clock.elapsedTime * 1.6;
  });

  if (!dish) return null;
  const url = modelUrl(dish.key);
  if (!url) return null;

  return (
    <group ref={spinRef} position={[0, height + (dish.done ? 0.12 : 0), 0]}>
      <Suspense fallback={null}>
        <Fitted url={url} height={dish.done ? 0.22 : 0.16} />
      </Suspense>
      {dish.done && <pointLight color="#ffc66d" intensity={1.6} distance={2.4} decay={2} position={[0, 0.2, 0]} />}
    </group>
  );
}

// ایستگاه پخت: رندر مدل + ثبت تعامل و نزدیکی
export default function CookingStation({ id }) {
  const def = STATIONS[id];
  const groupRef = useRef(null);
  const swingRef = useRef(null);
  const nearStation = usePlayerStore((s) => s.cookingStation === id);
  const nearInteractable = usePlayerStore((s) => s.nearInteractable);
  // فقط ایستگاهی که واقعاً در حال پخت است بخار می‌دهد
  const [cookingHere, setCookingHere] = useState(false);

  useEffect(() => {
    return subscribeCooking((type) => {
      if (type === 'start') setCookingHere(cooking.stationId === id);
      else if (type === 'result' || type === 'reset') setCookingHere(false);
    });
  }, [id]);

  useEffect(() => {
    if (!def) return undefined;
    // شیء رندر را به رجیستری raycast اضافه می‌کنیم
    const unsubObject = registerInteractable(`cook-${id}`, groupRef.current);
    // نزدیکی E → باز کردن UI پخت
    const unsubSpot = registerCookingStation({
      key: `cook-${id}`,
      stationId: id,
      label: 'برای پختن',
      x: def.pos.x,
      z: def.pos.z,
      radius: def.radius ?? 2,
      action: () => usePlayerStore.getState().openCooking(id),
    });
    return () => {
      unsubObject();
      unsubSpot();
    };
  }, [id, def]);

  // تکان ملایم دیگ/ماهیتابه هنگام باز بودن UI (بیرون React)
  useFrame(({ clock }) => {
    if (!swingRef.current) return;
    const t = clock.elapsedTime;
    swingRef.current.rotation.z = nearStation ? Math.sin(t * 6) * 0.05 : Math.sin(t * 1.4) * 0.012;
  });

  if (!def) return null;

  const hint = nearInteractable?.key === `cook-${id}`;

  if (id === 'grill') {
    // گریل سنگی کنار آتش کمپ (آتش موجود، شبکه‌ی گریل افزوده می‌شود)
    return (
      <group ref={groupRef} position={[def.pos.x, 0, def.pos.z]} rotation={[0, def.rotation || 0, 0]}>
        <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.4, 0.46, 0.36, 10]} />
          <meshStandardMaterial color="#4a4a52" roughness={0.95} flatShading />
        </mesh>
        <group ref={swingRef} position={[0, 0.38, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.55, 0.55, 0.03, 10]} />
            <meshStandardMaterial color="#3a3a42" roughness={0.5} metalness={0.7} />
          </mesh>
          {Array.from({ length: 5 }).map((_, i) => (
            <mesh key={i} position={[-0.42 + i * 0.21, 0.03, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.012, 0.012, 0.95, 4]} />
              <meshStandardMaterial color="#5a5a64" metalness={0.8} roughness={0.4} />
            </mesh>
          ))}
        </group>
        <pointLight position={[0, 0.3, 0]} color="#ff7a2c" intensity={4} distance={3.4} decay={2} />
        <Steam active={cookingHere} />
        <StationDish stationId={id} height={0.4} />
        {hint && <StationHint label="برای پختن" y={1.3} />}
      </group>
    );
  }

  if (id === 'pot') {
    return (
      <group ref={groupRef} position={[def.pos.x, 0, def.pos.z]} rotation={[0, def.rotation || 0, 0]}>
        <Tripod>
          <group ref={swingRef}>
            <Fitted url={POT_URL} height={0.55} position={[0, -0.28, 0]} />
          </group>
        </Tripod>
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[0.5, 20]} />
          <meshStandardMaterial color="#2a221c" roughness={1} />
        </mesh>
        <StationDish stationId={id} height={1.15} />
        <group position={[0, 1.2, 0]}>
          <Steam active={cookingHere} />
        </group>
        {hint && <StationHint label="برای پختن" y={2.1} />}
      </group>
    );
  }

  if (id === 'cauldron') {
    return (
      <group ref={groupRef} position={[def.pos.x, 0, def.pos.z]} rotation={[0, def.rotation || 0, 0]}>
        <group ref={swingRef}>
          <Fitted url={CAULDRON_URL} height={0.9} />
        </group>
        <mesh position={[0, 0.02, 0]} receiveShadow>
          <cylinderGeometry args={[0.72, 0.78, 0.12, 18]} />
          <meshStandardMaterial color="#2a221c" roughness={1} />
        </mesh>
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.42, 16]} />
          <meshBasicMaterial color="#ff6b2c" transparent opacity={0.35} depthWrite={false} />
        </mesh>
        <StationDish stationId={id} height={0.85} />
        <group position={[0, 0.95, 0]}>
          <Steam active={cookingHere} />
        </group>
        {hint && <StationHint label="برای پختن" y={1.6} />}
      </group>
    );
  }

  // pan
  return (
    <group ref={groupRef} position={[def.pos.x, 0, def.pos.z]} rotation={[0, def.rotation || 0, 0]}>
      {/* اجاق سنگی کوچک */}
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.42, 0.5, 0.36, 10]} />
        <meshStandardMaterial color="#4a4a52" roughness={0.95} flatShading />
      </mesh>
      <group ref={swingRef} position={[0, 0.4, 0]}>
        <Fitted url={PAN_URL} height={0.12} />
      </group>
      <pointLight position={[0, 0.3, 0]} color="#ff8a3d" intensity={5} distance={4} decay={2} />
      <group position={[0, 0.55, 0]}>
        <Steam active={cookingHere} />
      </group>
      <StationDish stationId={id} height={0.52} />
      {hint && <StationHint label="برای پختن" y={1.3} />}
    </group>
  );
}

function StationHint({ label, y = 2 }) {
  return (
    <Html center position={[0, y, 0]} distanceFactor={11} zIndexRange={[30, 0]}>
      <div className="pointer-events-none select-none whitespace-nowrap rounded-full border border-white/20 bg-[#171426]/85 px-2 py-0.5 text-[10px] text-[#f5ebdd]">
        {label} — E
      </div>
    </Html>
  );
}
