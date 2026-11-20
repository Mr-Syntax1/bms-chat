import { useMemo } from 'react';
import { CAMP_RADIUS } from '../sceneLayout';

// زمین دایره‌ای چمن + لبه‌ی تیره‌ی بیرونی + حصار چوبی مرزی
export default function Ground() {
  const woodPosts = useMemo(() => {
    const posts = [];
    const count = 44;
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2;
      posts.push({
        x: Math.cos(angle) * CAMP_RADIUS,
        z: Math.sin(angle) * CAMP_RADIUS,
        rotation: -angle,
      });
    }
    return posts;
  }, []);

  return (
    <group>
      {/* چمن اصلی */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[CAMP_RADIUS + 4, 64]} />
        <meshStandardMaterial color="#33513d" roughness={1} />
      </mesh>

      {/* لکه‌های چمن روشن‌تر برای بافت */}
      {[
        [4.5, -3.2, 3.4],
        [-5.2, 4.1, 2.8],
        [7.4, 5.6, 2.2],
        [-8.1, -4.4, 3.1],
        [1.4, -8.2, 2.6],
      ].map(([x, z, r], i) => (
        <mesh key={i} position={[x, 0.012, z]} rotation={[-Math.PI / 2, 0, i]} receiveShadow>
          <circleGeometry args={[r, 14]} />
          <meshStandardMaterial color={i % 2 ? '#3a5b45' : '#2d4936'} roughness={1} />
        </mesh>
      ))}

      {/* فضای بیرون کمپ (تاریک‌تر) */}
      <mesh position={[0, -0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[CAMP_RADIUS + 4, 120, 64]} />
        <meshStandardMaterial color="#16211b" roughness={1} />
      </mesh>

      {/* حصار چوبی مرزی */}
      {woodPosts.map((post, i) => (
        <group key={i} position={[post.x, 0, post.z]} rotation={[0, post.rotation, 0]}>
          <mesh position={[0, 0.42, 0]} castShadow>
            <cylinderGeometry args={[0.075, 0.09, 0.9, 5]} />
            <meshStandardMaterial color="#4b3627" roughness={1} flatShading />
          </mesh>
          {i % 2 === 0 && (
            <mesh position={[Math.cos(post.rotation) * 0.72, 0.56, -Math.sin(post.rotation) * 0.72]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.045, 0.045, 1.5, 4]} />
              <meshStandardMaterial color="#553d2c" roughness={1} flatShading />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

// نور محیطی ارزان برای شب
export function AmbientSetup() {  return (
    <>
      <ambientLight intensity={0.22} color="#8e9fd4" />
      <hemisphereLight args={['#4a6a8a', '#1a231c', 0.45]} />
      <directionalLight
        position={[12, 18, 9]}
        intensity={0.5}
        color="#a9c3ff"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
        shadow-bias={-0.001}
      />
      {/* نور پرکننده‌ی سرد از سمت مخالف */}
      <pointLight position={[-14, 9, -12]} intensity={12} distance={34} color="#4d6fa8" />
      {/* ماه */}
      <mesh position={[-22, 26, -28]}>
        <sphereGeometry args={[2.4, 16, 16]} />
        <meshBasicMaterial color="#e9f0ff" fog={false} />
      </mesh>
      {/* هاله‌ی ماه */}
      <mesh position={[-22, 26, -28]}>
        <sphereGeometry args={[3.6, 16, 16]} />
        <meshBasicMaterial color="#aebfe6" transparent opacity={0.16} fog={false} />
      </mesh>
    </>
  );
}
