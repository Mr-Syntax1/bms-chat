import '../models/setupDraco';
import { useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { modelUrl } from '../assetManifest';

const GUITAR_URL = modelUrl('structures.guitar');
const ROD_URL = modelUrl('fishing.rod');

// لنگر پیش‌فرض پروپ (مدل استاندارد ۱.۷۵ واحدی) — کاراکتر مقدار خودش را می‌دهد
const DEFAULT_ANCHOR = { x: 0.34, y: 0.95, z: 0.28, scale: 1 };

// هر prop می‌تواند مقدار ثابت، ref یا تابع getter باشد (بدون re-render)
function resolve(value) {
  if (typeof value === 'function') return value();
  if (value && typeof value === 'object' && 'current' in value) return value.current;
  return value;
}

/**
 * مدل GLB را حول مرکز خودش نرمال می‌کند و بزرگ‌ترین بُعد را به `length` می‌رساند.
 * خروجی وسط‌چین است تا موقعیت‌دهی نسبت به بدن ساده باشد.
 */
function useNormalizedModel(url, length) {
  const { scene } = useGLTF(url);
  return useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });

    const box = new THREE.Box3().setFromObject(copy);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const longest = Math.max(size.x, size.y, size.z) || 1;
    return {
      object: copy,
      scale: length / longest,
      center: [center.x, center.y, center.z],
    };
  }, [scene, length]);
}

/**
 * گیتار در دست راست. مختصات در مقیاس قد نهایی کاراکتر (۱.۷۵ واحد) است.
 */
function HeldGuitar({ anchor }) {
  const { object, scale, center } = useNormalizedModel(GUITAR_URL, 1.05);
  return (
    <group position={[anchor.x, anchor.y + 0.03, anchor.z]} rotation={[-0.35, -0.45, -0.5]} scale={anchor.scale}>
      <group scale={scale}>
        <primitive object={object} position={[-center[0], -center[1], -center[2]]} />
      </group>
    </group>
  );
}

/**
 * چوب ماهیگیری در دست — کشیده به جلو و بالا با زاویه‌ی طبیعی پرتاب.
 * طول ۱.۹ واحد تا فراتر از بدن دیده شود.
 */
function HeldRod({ anchor }) {
  const { object, scale, center } = useNormalizedModel(ROD_URL, 1.9);
  return (
    <group position={[anchor.x - 0.08, anchor.y + 0.22, anchor.z + 0.1]} rotation={[0.35, 0, -0.55]} scale={anchor.scale}>
      <group scale={scale}>
        <primitive object={object} position={[-center[0], -center[1], -center[2]]} />
      </group>
    </group>
  );
}

const STAGE_COLORS = {
  raw: '#fdf6ec',
  roasting: '#f3dcae',
  ready: '#b9793f',
};

/**
 * سیخ مارشمالو در دست.
 * رنگ/درخشش در useFrame از طریق ref آپدیت می‌شود تا با تغییر مرحله‌ی
 * برشته شدن هم‌گام بماند و re-render لازم نباشد.
 */
function HeldMarshmallow({ stage, anchor }) {
  const materialRef = useRef(null);
  const lightRef = useRef(null);

  useFrame(() => {
    const current = resolve(stage) || 'roasting';
    const material = materialRef.current;
    if (!material) return;
    material.color.set(STAGE_COLORS[current] || STAGE_COLORS.roasting);
    const toasted = current === 'ready';
    material.emissiveIntensity = toasted ? 0.55 : 0;
    if (lightRef.current) lightRef.current.visible = toasted;
  });

  return (
    <group position={[anchor.x, anchor.y, anchor.z]} rotation={[-0.75, 0.2, 0.15]} scale={anchor.scale}>
      {/* میله‌ی چوبی */}
      <mesh position={[0, 0.36, 0]} castShadow>
        <cylinderGeometry args={[0.013, 0.011, 0.75, 6]} />
        <meshStandardMaterial color="#8a5a34" roughness={0.9} />
      </mesh>

      {/* مارشمالو */}
      <mesh position={[0, 0.74, 0]} castShadow>
        <boxGeometry args={[0.11, 0.13, 0.11]} />
        <meshStandardMaterial
          ref={materialRef}
          color="#f3dcae"
          emissive="#ff8a3d"
          emissiveIntensity={0}
          roughness={0.65}
        />
      </mesh>

      <pointLight
        ref={lightRef}
        color="#ff9a4d"
        intensity={0.5}
        distance={1.6}
        decay={2}
        position={[0, 0.74, 0]}
        visible={false}
      />
    </group>
  );
}

/**
 * پروپ‌های در دست کاراکتر.
 * اکشن/مرحله هر فریم از prop (ثابت، ref یا getter) خوانده می‌شود و
 * فقط گروه مربوطه visible می‌شود؛ هیچ re-render رخ نمی‌دهد.
 */
export default function HeldProps({ action, marshmallowStage, anchor }) {
  const guitarRef = useRef(null);
  const marshmallowRef = useRef(null);
  const rodRef = useRef(null);
  const resolvedAnchor = anchor || DEFAULT_ANCHOR;

  useFrame(() => {
    const current = resolve(action);
    if (guitarRef.current) guitarRef.current.visible = current === 'guitar';
    if (marshmallowRef.current) marshmallowRef.current.visible = current === 'marshmallow';
    if (rodRef.current) rodRef.current.visible = current === 'fishing-hold';
  });

  return (
    <group>
      <group ref={guitarRef} visible={false}>
        <HeldGuitar anchor={resolvedAnchor} />
      </group>
      <group ref={marshmallowRef} visible={false}>
        <HeldMarshmallow stage={marshmallowStage} anchor={resolvedAnchor} />
      </group>
      {ROD_URL && (
        <group ref={rodRef} visible={false}>
          <HeldRod anchor={resolvedAnchor} />
        </group>
      )}
    </group>
  );
}

if (GUITAR_URL) useGLTF.preload(GUITAR_URL);
if (ROD_URL) useGLTF.preload(ROD_URL);
