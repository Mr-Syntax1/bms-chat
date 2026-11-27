// عینک‌های رویه‌ای — دو حلقه/مستطیل + پل، در فضای کاراکتر ۱.۷۵ واحدی
function RoundLens({ x }) {
  return (
    <mesh position={[x, 0, 0]} castShadow>
      <torusGeometry args={[0.055, 0.011, 8, 18]} />
      <meshStandardMaterial color="#2b2733" roughness={0.5} metalness={0.4} />
    </mesh>
  );
}

function SunLens({ x }) {
  return (
    <mesh position={[x, 0, 0]} castShadow>
      <boxGeometry args={[0.105, 0.07, 0.02]} />
      <meshStandardMaterial color="#14121b" roughness={0.25} metalness={0.55} />
    </mesh>
  );
}

/**
 * عینک روی چشم‌ها؛ z مثبت = جلوی صورت.
 * `y` و `z` از بیرون تعیین می‌شوند (آفست خط چشم نسبت به لنگر سر).
 */
export default function Glasses({ value, y = 0, z = 0 }) {
  if (value !== 'round' && value !== 'sun') return null;
  const isSun = value === 'sun';
  const Lens = isSun ? SunLens : RoundLens;
  const gap = isSun ? 0.065 : 0.062;

  return (
    <group position={[0, y, z]}>
      <Lens x={-gap} />
      <Lens x={gap} />
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.03, 0.012, 0.012]} />
        <meshStandardMaterial color="#2b2733" roughness={0.5} metalness={0.4} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (gap + 0.06), 0, -0.04]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[0.09, 0.01, 0.01]} />
          <meshStandardMaterial color="#2b2733" roughness={0.5} metalness={0.4} />
        </mesh>
      ))}
    </group>
  );
}
