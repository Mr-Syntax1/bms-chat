import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { modelUrl } from '../assetManifest';

// کلاه‌های رویه‌ای — همه با primitive، در فضای کاراکتر ۱.۷۵ واحدی
const FELT = { roughness: 0.85 };

function Cone({ r, h, y, color }) {
  return (
    <mesh position={[0, y, 0]} castShadow>
      <coneGeometry args={[r, h, 18]} />
      <meshStandardMaterial color={color} {...FELT} />
    </mesh>
  );
}

function Disc({ r, h, y, color }) {
  return (
    <mesh position={[0, y, 0]} castShadow>
      <cylinderGeometry args={[r, r, h, 22]} />
      <meshStandardMaterial color={color} {...FELT} />
    </mesh>
  );
}

// نیم‌کره‌ی بالای سر
function Dome({ r, y, color }) {
  return (
    <mesh position={[0, y, 0]} castShadow>
      <sphereGeometry args={[r, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color={color} {...FELT} side={2} />
    </mesh>
  );
}

function PartyHat() {
  return (
    <group>
      <Cone r={0.19} h={0.36} y={0.18} color="#f06292" />
      <mesh position={[0, 0.38, 0]} castShadow>
        <sphereGeometry args={[0.045, 10, 10]} />
        <meshStandardMaterial color="#ffe082" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.13, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.17, 0.012, 8, 20]} />
        <meshStandardMaterial color="#fff59d" roughness={0.6} />
      </mesh>
    </group>
  );
}

function WizardHat() {
  return (
    <group>
      <Disc r={0.32} h={0.025} y={0.01} color="#3d3a6b" />
      <Cone r={0.22} h={0.52} y={0.28} color="#4a4690" />
      <mesh position={[0, 0.505, 0]} castShadow>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color="#ffd54f" roughness={0.5} />
      </mesh>
    </group>
  );
}

function ChefHat() {
  return (
    <group>
      <Disc r={0.17} h={0.09} y={0.045} color="#f7f4ee" />
      <mesh position={[0, 0.19, 0]} castShadow>
        <sphereGeometry args={[0.19, 18, 12]} />
        <meshStandardMaterial color="#ffffff" roughness={0.95} />
      </mesh>
    </group>
  );
}

function Beanie() {
  return (
    <group>
      <Dome r={0.2} y={0.02} color="#c0563f" />
      <Disc r={0.205} h={0.07} y={0.01} color="#a5442f" />
      <mesh position={[0, 0.21, 0]} castShadow>
        <sphereGeometry args={[0.045, 10, 10]} />
        <meshStandardMaterial color="#f7e0b0" roughness={0.9} />
      </mesh>
    </group>
  );
}

function StrawHat() {
  return (
    <group>
      <Disc r={0.36} h={0.022} y={0.01} color="#e8c56a" />
      <Cone r={0.2} h={0.19} y={0.11} color="#dfb95a" />
    </group>
  );
}

function BaseballCap() {
  return (
    <group>
      <Dome r={0.2} y={0.01} color="#2f6fb5" />
      <mesh position={[0, 0.02, 0.2]} rotation={[-0.16, 0, 0]} castShadow>
        <boxGeometry args={[0.3, 0.02, 0.2]} />
        <meshStandardMaterial color="#275f9c" roughness={0.8} />
      </mesh>
    </group>
  );
}

function FlowerCrown() {
  const flowers = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2;
        return { x: Math.cos(a) * 0.18, z: Math.sin(a) * 0.18, color: i % 2 ? '#f7a8c4' : '#ffe082' };
      }),
    []
  );
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.18, 0.022, 8, 22]} />
        <meshStandardMaterial color="#7bb26a" roughness={0.9} />
      </mesh>
      {flowers.map((f, i) => (
        <mesh key={i} position={[f.x, 0.03, f.z]} castShadow>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshStandardMaterial color={f.color} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function CatEars() {
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side} position={[0.12 * side, 0.06, 0]} rotation={[0, 0, -0.16 * side]}>
          <mesh castShadow>
            <coneGeometry args={[0.07, 0.16, 4]} />
            <meshStandardMaterial color="#2b2733" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.005, 0.015]} scale={0.6}>
            <coneGeometry args={[0.07, 0.13, 4]} />
            <meshStandardMaterial color="#f08fa8" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

const HAT_MAP = {
  party: PartyHat,
  wizard: WizardHat,
  chef: ChefHat,
  beanie: Beanie,
  straw: StrawHat,
  baseball: BaseballCap,
  flowerCrown: FlowerCrown,
  catEars: CatEars,
};

export default function Hat({ value }) {
  const Comp = HAT_MAP[value];
  if (!Comp) return null;
  return <Comp />;
}

// کوله‌پشتی از GLB موجود؛ شال گردنی رویه‌ای
function Backpack() {
  const { scene } = useGLTF(modelUrl('structures.backpack'));
  const object = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((c) => {
      if (c.isMesh) {
        c.castShadow = true;
        c.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);

  return (
    <group position={[0, 1.0, -0.24]} rotation={[0, Math.PI, 0]} scale={0.9}>
      <primitive object={object} scale={0.7} />
    </group>
  );
}

function Scarf() {
  return (
    <group position={[0, 1.36, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.19, 0.06, 10, 22]} />
        <meshStandardMaterial color="#c9553f" roughness={0.95} />
      </mesh>
      <mesh position={[0.1, -0.22, 0.14]} rotation={[0.12, 0, 0.1]} castShadow>
        <boxGeometry args={[0.11, 0.42, 0.04]} />
        <meshStandardMaterial color="#b6492f" roughness={0.95} />
      </mesh>
    </group>
  );
}

export function Accessory({ value }) {
  if (value === 'backpack') return <Backpack />;
  if (value === 'scarf') return <Scarf />;
  return null;
}

if (modelUrl('structures.backpack')) useGLTF.preload(modelUrl('structures.backpack'));
