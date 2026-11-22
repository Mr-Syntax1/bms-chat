import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CAMP_RADIUS, SAND_START_X, WATER_START_X, MAP_SIZE, HALF_MAP } from '../sceneLayout';

// آب با شیدر موج ساده
function Water() {
  const materialRef = useRef(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color('#1f6f8b') },
      uColorB: { value: new THREE.Color('#4fd1c5') },
    }),
    []
  );

  useFrame(({ clock }) => {
    if (materialRef.current) materialRef.current.uniforms.uTime.value = clock.elapsedTime;
  });

  const width = HALF_MAP - WATER_START_X;

  return (
    <mesh position={[WATER_START_X + width / 2, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[width, MAP_SIZE, 48, 48]} />
      <shaderMaterial
        ref={materialRef}
        transparent
        uniforms={uniforms}
        vertexShader={`
          uniform float uTime;
          varying vec2 vUv;
          varying float vWave;
          void main() {
            vUv = uv;
            vec3 p = position;
            float w = sin(p.x * 0.35 + uTime * 1.2) * 0.12
                    + sin(p.y * 0.5 + uTime * 0.8) * 0.09;
            p.z += w;
            vWave = w;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform vec3 uColorA;
          uniform vec3 uColorB;
          varying vec2 vUv;
          varying float vWave;
          void main() {
            float shimmer = 0.5 + 0.5 * sin(vUv.x * 60.0 + uTime * 2.0 + vUv.y * 20.0);
            vec3 color = mix(uColorA, uColorB, shimmer * 0.55 + vWave * 0.6 + 0.2);
            gl_FragColor = vec4(color, 0.86);
          }
        `}
      />
    </mesh>
  );
}

// زمین: چمن (غرب) + شن (شرق) + آب
export default function Ground() {
  const sandWidth = WATER_START_X - SAND_START_X;

  return (
    <group>
      {/* چمن اصلی */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[MAP_SIZE, MAP_SIZE]} />
        <meshStandardMaterial color="#2f4a38" roughness={1} />
      </mesh>

      {/* نوار شن ساحل */}
      <mesh
        position={[SAND_START_X + sandWidth / 2, 0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[sandWidth, MAP_SIZE]} />
        <meshStandardMaterial color="#c9b483" roughness={1} />
      </mesh>

      {/* دایره‌ی خاکی مرکز کمپ */}
      <mesh position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[CAMP_RADIUS, 48]} />
        <meshStandardMaterial color="#3d4b36" roughness={1} />
      </mesh>

      {/* لکه‌های چمن با تنوع رنگی */}
      {[
        [6.5, -4.8, 4.2],
        [-7.4, 5.9, 3.6],
        [9.8, 7.4, 3.1],
        [-10.6, -6.2, 4.4],
        [2.2, -11.4, 3.4],
        [16, 12, 6.5],
        [-19, 9, 7],
        [13, -18, 6],
        [-14, -21, 7.5],
        [26, 4, 8],
        [-4, 30, 9],
        [-40, -40, 12],
        [-60, 20, 14],
        [-30, 60, 11],
      ].map(([x, z, r], i) => (
        <mesh key={i} position={[x, 0.016 + i * 0.0004, z]} rotation={[-Math.PI / 2, 0, i]} receiveShadow>
          <circleGeometry args={[r, 16]} />
          <meshStandardMaterial color={i % 2 ? '#375441' : '#2a4331'} roughness={1} />
        </mesh>
      ))}

      {/* لکه‌های شن تیره‌تر برای تنوع */}
      {[
        [40, -30, 7],
        [55, 25, 9],
        [48, 60, 8],
        [62, -55, 10],
        [50, -70, 7],
      ].map(([x, z, r], i) => (
        <mesh key={`s${i}`} position={[x, 0.018 + i * 0.0004, z]} rotation={[-Math.PI / 2, 0, i]} receiveShadow>
          <circleGeometry args={[r, 16]} />
          <meshStandardMaterial color={i % 2 ? '#bda87a' : '#d4c091'} roughness={1} />
        </mesh>
      ))}

      <Water />
    </group>
  );
}

// نورپردازی شب دنج
export function AmbientSetup() {
  return (
    <>
      <ambientLight intensity={0.3} color="#93a7d4" />
      <hemisphereLight args={['#5d7fa8', '#1b2a20', 0.55]} />

      <directionalLight
        position={[26, 34, 18]}
        intensity={0.75}
        color="#b7caff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
        shadow-bias={-0.0012}
        shadow-normalBias={0.03}
      />

      <pointLight position={[-30, 16, -26]} intensity={40} distance={90} color="#4d6fa8" decay={1.8} />
    </>
  );
}
