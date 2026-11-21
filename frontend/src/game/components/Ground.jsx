import { useMemo } from 'react';
import { CAMP_RADIUS, GROUND_RADIUS, PATHS } from '../sceneLayout';

// زمین چمن بزرگ + دایره‌ی خاکی مرکز + مسیرهای خاکی بین درختان
export default function Ground() {
  // نقاط مسیر: از لبه‌ی کمپ تا انتهای جنگل
  const pathStrips = useMemo(
    () =>
      PATHS.map((path) => {
        const length = GROUND_RADIUS - CAMP_RADIUS + 6;
        const mid = CAMP_RADIUS + length / 2 - 3;
        return {
          x: Math.cos(path.angle) * mid,
          z: Math.sin(path.angle) * mid,
          length,
          rotation: -path.angle + Math.PI / 2,
        };
      }),
    []
  );

  return (
    <group>
      {/* چمن اصلی */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[GROUND_RADIUS, 72]} />
        <meshStandardMaterial color="#2f4a38" roughness={1} />
      </mesh>

      {/* دایره‌ی خاکی مرکز کمپ */}
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
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
      ].map(([x, z, r], i) => (
        <mesh key={i} position={[x, 0.014 + i * 0.0004, z]} rotation={[-Math.PI / 2, 0, i]} receiveShadow>
          <circleGeometry args={[r, 16]} />
          <meshStandardMaterial color={i % 2 ? '#375441' : '#2a4331'} roughness={1} />
        </mesh>
      ))}

      {/* مسیرهای خاکی به داخل جنگل */}
      {pathStrips.map((strip, i) => (
        <mesh
          key={i}
          position={[strip.x, 0.018, strip.z]}
          rotation={[-Math.PI / 2, 0, strip.rotation]}
          receiveShadow
        >
          <planeGeometry args={[4.4, strip.length]} />
          <meshStandardMaterial color="#4a3f30" roughness={1} />
        </mesh>
      ))}

      {/* فضای بیرون جنگل: تاریک و محو */}
      <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[GROUND_RADIUS, 260, 64]} />
        <meshStandardMaterial color="#101a14" roughness={1} />
      </mesh>
    </group>
  );
}

// نورپردازی شب دنج
export function AmbientSetup() {
  return (
    <>
      {/* نور محیطی آبی سرد (شب) */}
      <ambientLight intensity={0.3} color="#93a7d4" />
      <hemisphereLight args={['#5d7fa8', '#1b2a20', 0.55]} />

      {/* نور ماه از بالا */}
      <directionalLight
        position={[26, 34, 18]}
        intensity={0.75}
        color="#b7caff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
        shadow-bias={-0.0012}
        shadow-normalBias={0.03}
      />

      {/* نور پرکننده‌ی سرد از سمت مخالف */}
      <pointLight position={[-30, 16, -26]} intensity={40} distance={80} color="#4d6fa8" decay={1.8} />

      {/* ماه */}
      <mesh position={[-48, 56, -62]}>
        <sphereGeometry args={[5, 20, 20]} />
        <meshBasicMaterial color="#e9f0ff" fog={false} />
      </mesh>
      <mesh position={[-48, 56, -62]}>
        <sphereGeometry args={[7.5, 20, 20]} />
        <meshBasicMaterial color="#aebfe6" transparent opacity={0.14} fog={false} />
      </mesh>
    </>
  );
}
