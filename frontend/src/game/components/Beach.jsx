import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  PALMS,
  BEACH_SHELLS,
  ROCK_PATH,
  DOCK,
  LIGHTHOUSE,
  BOATS,
} from '../sceneLayout';
import { getGroundHeight, WATER_LEVEL, DOCK_PLATFORM } from '../terrain';
import InstancedGLB from '../models/InstancedGLB';
import { modelUrl } from '../assetManifest';
import {
  PortModel,
  BoatModel,
  RowboatModel,
  LighthouseModel,
} from '../models/props';

// نخل‌ها بر اساس نوع مدل گروه‌بندی می‌شوند (هر گروه یک InstancedMesh)
const PALM_URLS = [
  modelUrl('beach.palm'),
  modelUrl('beach.palm2'),
  modelUrl('beach.coconutPalm'),
];
const PALM_TARGET_HEIGHT = [7, 9, 12];

function Palms() {
  const groups = useMemo(() => {
    const byVariant = [[], [], []];
    PALMS.forEach((palm) => byVariant[palm.variant % 3].push(palm));
    return byVariant;
  }, []);

  return (
    <group>
      {groups.map((items, i) => (
        <InstancedGLB
          key={i}
          url={PALM_URLS[i]}
          items={items}
          targetHeight={PALM_TARGET_HEIGHT[i]}
          groundAlign
        />
      ))}
    </group>
  );
}

// صدف/ستاره/صدف دوکفه‌ای روی شن
const SHELL_URLS = [
  modelUrl('beach.clam'),
  modelUrl('beach.seashell'),
  modelUrl('beach.starfish'),
];

function BeachShells() {
  const groups = useMemo(() => {
    const byVariant = [[], [], []];
    BEACH_SHELLS.forEach((shell) => byVariant[shell.variant % 3].push(shell));
    return byVariant;
  }, []);

  return (
    <group>
      {groups.map((items, i) => (
        <InstancedGLB key={i} url={SHELL_URLS[i]} items={items} targetHeight={0.28} y={0.02} groundAlign />
      ))}
    </group>
  );
}

// مسیر سنگی از کمپ تا اسکله
function RockPath() {
  return (
    <InstancedGLB
      url={modelUrl('paths.stonePath')}
      items={ROCK_PATH}
      targetHeight={0.12}
      y={0.01}
      castShadow={false}
      groundAlign
    />
  );
}

// اسکله‌ی چوبی: مدل Port + تخته‌های اضافی
// ارتفاع از DOCK_PLATFORM می‌آید تا فیزیک و رندر یکی باشند
const DECK_Y = DOCK_PLATFORM.topY;

// تنوع رنگ تخته‌ها حول قهوه‌ای چوبی #8B6F47
const PLANK_TINTS = ['#8B6F47', '#82673f', '#93764d', '#7a6039', '#8e7249'];

function Dock() {
  const planks = useMemo(() => {
    const list = [];
    // تخته‌ها دقیقاً روی محدوده‌ی سکوی فیزیک پخش می‌شوند
    const startX = DOCK_PLATFORM.minX;
    const endX = DOCK_PLATFORM.maxX;
    const count = Math.ceil((endX - startX) / 0.92);
    for (let i = 0; i < count; i += 1) {
      list.push({ x: startX + 0.46 + i * 0.92, z: (DOCK_PLATFORM.minZ + DOCK_PLATFORM.maxZ) * 0.5 });
    }
    return list;
  }, []);

  return (
    <group>
      <group position={[DOCK.x + 4, DECK_Y - 0.06, DOCK.z]} rotation={[0, Math.PI / 2, 0]}>
        <PortModel scale={1.6} />
      </group>
      {planks.map((p, i) => (
        <mesh key={i} position={[p.x, DECK_Y, p.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow castShadow>
          <boxGeometry args={[0.92, DOCK_PLATFORM.maxZ - DOCK_PLATFORM.minZ, 0.14]} />
          <meshStandardMaterial color={PLANK_TINTS[i % PLANK_TINTS.length]} roughness={0.92} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[
            DOCK_PLATFORM.maxX - 2,
            DECK_Y - 0.65,
            (DOCK_PLATFORM.minZ + DOCK_PLATFORM.maxZ) * 0.5 + side * (DOCK_PLATFORM.maxZ - DOCK_PLATFORM.minZ) * 0.4,
          ]}
          castShadow
        >
          <cylinderGeometry args={[0.15, 0.15, 1.6, 8]} />
          <meshStandardMaterial color="#4a3826" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

// فانوس دریایی با نور چشمک‌زن
function Lighthouse() {
  const lightRef = useRef(null);
  const baseY = getGroundHeight(LIGHTHOUSE.x, LIGHTHOUSE.z);

  useFrame(({ clock }) => {
    if (!lightRef.current) return;
    const pulse = Math.pow(Math.max(0, Math.sin(clock.elapsedTime * 1.4)), 8);
    lightRef.current.intensity = 6 + pulse * 90;
  });

  return (
    <group position={[LIGHTHOUSE.x, baseY, LIGHTHOUSE.z]}>
      <LighthouseModel scale={1.2} />
      <pointLight
        ref={lightRef}
        position={[0, 13, 0]}
        color="#ffe9a8"
        intensity={8}
        distance={80}
        decay={1.4}
      />
    </group>
  );
}

// قایق‌ها کنار اسکله با تکان ملایم روی آب
function Boats() {
  const refs = useRef([]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    refs.current.forEach((group, i) => {
      if (!group) return;
      group.position.y = WATER_LEVEL + 0.12 + Math.sin(t * 0.9 + i * 1.7) * 0.09;
      group.rotation.z = Math.sin(t * 0.7 + i) * 0.04;
    });
  });

  const Components = [BoatModel, RowboatModel];

  return (
    <group>
      {BOATS.map((boat, i) => {
        const Component = Components[i % Components.length];
        return (
          <group
            key={i}
            ref={(node) => {
              refs.current[i] = node;
            }}
            position={[boat.x, WATER_LEVEL + 0.12, boat.z]}
            rotation={[0, boat.rotation, 0]}
            scale={boat.scale}
          >
            <Component />
          </group>
        );
      })}
    </group>
  );
}

export default function Beach() {
  return (
    <group>
      <Palms />
      <BeachShells />
      <RockPath />
      <Dock />
      <Boats />
      <Lighthouse />
    </group>
  );
}