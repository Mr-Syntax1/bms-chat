import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import Ground, { AmbientSetup } from './Ground';
import Forest from './Forest';
import Campfire from './Campfire';
import Van from './Van';
import Decorations from './Decorations';
import AmbientAudio from './AmbientAudio';
import { CAMP_RADIUS } from '../sceneLayout';

// کرم شب‌تاب: نقاط نورانی آرام اطراف کمپ
function Fireflies() {
  return (
    <Sparkles
      count={90}
      scale={[CAMP_RADIUS * 1.6, 5, CAMP_RADIUS * 1.6]}
      position={[0, 1.6, 0]}
      size={3.6}
      speed={0.22}
      opacity={0.55}
      color="#ffe07a"
      noise={1.4}
    />
  );
}

// آسمان شب: گرادیان عمودی ساده بدون asset خارجی
function NightSky() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          topColor: { value: new THREE.Color('#0b1224') },
          bottomColor: { value: new THREE.Color('#2c3b52') },
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

  return (
    <mesh material={material} scale={[1, 1, 1]}>
      <sphereGeometry args={[160, 32, 16]} />
    </mesh>
  );
}

// ابرهای ساده‌ی Low-poly بدون تکسچر خارجی (چند کره‌ی به‌هم‌چسبیده)
function LowPolyClouds() {
  const groupRef = useRef(null);

  const clouds = useMemo(
    () => [
      { position: [16, 22, -26], scale: 1.5, drift: 0.35 },
      { position: [-24, 26, -14], scale: 1.9, drift: 0.22 },
      { position: [4, 30, -38], scale: 1.2, drift: 0.45 },
    ],
    []
  );

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;
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
  return (
    <>
      <color attach="background" args={['#0b1020']} />
      <fog attach="fog" args={['#101a28', 24, 78]} />

      <NightSky />
      <Stars radius={90} depth={48} count={2200} factor={3.6} saturation={0} fade speed={0.4} />

      <LowPolyClouds />

      <AmbientSetup />

      <Ground />
      <Forest />
      <Decorations />
      <Campfire />
      <Van />
      <Fireflies />

      {/* صدای محیطی مکانی: آتش، جیرجیرک و باد */}
      <AmbientAudio />

      {/* پس‌پردازش سبک: بلوم برای آتش، وینیت برای تمرکز بصری */}
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.55} luminanceThreshold={0.62} luminanceSmoothing={0.28} mipmapBlur />
        <Vignette eskil={false} offset={0.32} darkness={0.72} />
      </EffectComposer>
    </>
  );
}
