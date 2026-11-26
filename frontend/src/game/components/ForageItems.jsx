// ---------------------------------------------------------------------------
// ForageItems.jsx — آیتم‌های قابل چیدن (Phase 3d)
//
//  • مدل‌های موجود: Mushrooms / MushroomLaetiporus / Flowers / BushbyQuaternius.
//  • بقیه رویه‌ای: توت (کره‌های قرمز روی بوته)، گیاه (تیغه‌های سبز)، میوه‌ی کاج (مخروط).
//  • «چیده‌شده» در forageWorld.picked است؛ فقط در یک useFrame مشترک visibility
//    عوض می‌شود — هیچ re-render در چرخه‌ی ری‌اسپاون رخ نمی‌دهد.
//  • درخشش ملایم: حلقه‌ی additive با پالس opacity + کمی بالا-پایین.
// ---------------------------------------------------------------------------
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { modelUrl } from '../assetManifest';
import Fitted from '../models/Fitted';
import { getForageList, forageWorld } from '../forageData';

const MUSHROOM_URL = modelUrl('undergrowth.mushrooms');
const LAETIPORUS_URL = modelUrl('undergrowth.edibleMushroom');
const FLOWERS_URL = modelUrl('undergrowth.flowers');
const BUSH_URL = modelUrl('undergrowth.bush');

// توت‌ها روی بوته: کره‌های قرمز کوچک
const BERRY_OFFSETS = [
  [0.18, 0.42, 0.12],
  [-0.2, 0.36, 0.16],
  [0.08, 0.5, -0.16],
  [-0.12, 0.3, -0.18],
  [0.24, 0.28, -0.05],
];

function BerryCluster() {
  return (
    <group>
      {BUSH_URL && <Fitted url={BUSH_URL} height={0.72} />}
      {BERRY_OFFSETS.map((p, i) => (
        <mesh key={i} position={p} castShadow>
          <sphereGeometry args={[0.075, 8, 7]} />
          <meshStandardMaterial color="#e04a4a" roughness={0.5} emissive="#7a1414" emissiveIntensity={0.25} />
        </mesh>
      ))}
    </group>
  );
}

// گیاه معطر: چند تیغه‌ی مخروطی سبز + خوشه‌ی برگ
function HerbSprig() {
  return (
    <group>
      {[-0.06, 0, 0.07].map((dx, i) => (
        <mesh key={i} position={[dx, 0.22 + i * 0.03, (i - 1) * 0.05]} rotation={[0, i, (i - 1) * 0.18]} castShadow>
          <coneGeometry args={[0.045, 0.5, 5]} />
          <meshStandardMaterial color="#5fa86a" roughness={0.85} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 0.42, 0]} castShadow>
        <icosahedronGeometry args={[0.11, 0]} />
        <meshStandardMaterial color="#7fd08a" roughness={0.8} flatShading />
      </mesh>
    </group>
  );
}

// میوه‌ی کاج: مخروط قهوه‌ای با پولک‌های ساده
function Pinecone() {
  return (
    <group>
      <mesh position={[0, 0.11, 0]} castShadow>
        <coneGeometry args={[0.12, 0.24, 8]} />
        <meshStandardMaterial color="#7a4a26" roughness={0.9} flatShading />
      </mesh>
      {[0.06, 0.11, 0.16].map((y, ring) => (
        <mesh key={ring} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.1 - ring * 0.02, 0.018, 5, 10]} />
          <meshStandardMaterial color="#8a5a34" roughness={0.85} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function ForageModel({ type }) {
  if (type === 'mushroom') return MUSHROOM_URL ? <Fitted url={MUSHROOM_URL} height={0.32} /> : null;
  if (type === 'laetiporus') return LAETIPORUS_URL ? <Fitted url={LAETIPORUS_URL} height={0.4} /> : null;
  if (type === 'flower') return FLOWERS_URL ? <Fitted url={FLOWERS_URL} height={0.42} /> : null;
  if (type === 'berries') return <BerryCluster />;
  if (type === 'herb') return <HerbSprig />;
  if (type === 'pinecone') return <Pinecone />;
  return null;
}

export default function ForageItems() {
  const list = useMemo(() => getForageList(), []);
  const groupRefs = useRef([]);
  const glowRefs = useRef([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const { picked } = forageWorld;
    for (let i = 0; i < list.length; i += 1) {
      const group = groupRefs.current[i];
      if (!group) continue;
      const visible = !picked[i];
      group.visible = visible;
      if (!visible) continue;
      const item = list[i];
      group.position.y = item.y + 0.02 + Math.sin(t * 1.4 + item.phase) * 0.025;
      group.rotation.y = item.rotation + Math.sin(t * 0.4 + item.phase) * 0.08;
      const glow = glowRefs.current[i];
      if (glow) glow.material.opacity = 0.14 + (Math.sin(t * 2 + item.phase) * 0.5 + 0.5) * 0.16;
    }
  });

  return (
    <group>
      {list.map((item, i) => (
        <group
          key={i}
          ref={(node) => {
            groupRefs.current[i] = node;
          }}
          position={[item.x, item.y, item.z]}
          rotation={[0, item.rotation, 0]}
          scale={item.scale}
        >
          <ForageModel type={item.type} />
          {/* حلقه‌ی درخشش ملایم زیر آیتم */}
          <mesh
            ref={(node) => {
              glowRefs.current[i] = node;
            }}
            position={[0, 0.015, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[0.22, 0.34, 20]} />
            <meshBasicMaterial
              color={item.color}
              transparent
              opacity={0.18}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
