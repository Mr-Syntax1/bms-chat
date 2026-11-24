import { useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import VoiceBubble from './VoiceActivityIndicator';

const NEAR = 24;
const FAR = 30;

/**
 * نام‌شناور بالای سر بازیکن ریموت؛ با فاصله تا دوربین محو می‌شود
 * (اپسیتی روی DOM نوشته می‌شود، بدون re-render).
 */
export default function NameTag({ name, id, color, groupRef }) {
  const divRef = useRef(null);

  useFrame(({ camera }) => {
    const el = divRef.current;
    const g = groupRef?.current;
    if (!el || !g) return;
    const dx = camera.position.x - g.position.x;
    const dz = camera.position.z - g.position.z;
    const dist = Math.hypot(dx, dz);
    const opacity = dist <= NEAR ? 1 : dist >= FAR ? 0 : 1 - (dist - NEAR) / (FAR - NEAR);
    el.style.opacity = String(opacity);
    el.style.visibility = opacity <= 0.02 ? 'hidden' : 'visible';
  });

  return (
    <Html center position={[0, 2.15, 0]} distanceFactor={14} occlude zIndexRange={[20, 0]}>
      <div
        ref={divRef}
        className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/15 bg-[#171426]/70 px-2.5 py-1 text-[11px] text-[#f5ebdd] backdrop-blur-md"
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        <VoiceBubble id={id} />
        <span>{name}</span>
      </div>
    </Html>
  );
}
