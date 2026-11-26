import { useEffect, useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { chatBubbleMap } from '../stores/usePlayerStore';

const BUBBLE_MS = 5000;

/**
 * حباب چت بالای سر: متن را از chatBubbleMap می‌خواند و پس از ۵ ثانیه پنهان
 * می‌شود (فقط وقتی متن عوض شود state می‌شود؛ محو شدن با CSS).
 */
export default function ChatBubble({ id }) {
  const [text, setText] = useState(null);
  const lastRef = useRef(null);

  useEffect(() => {
    let raf = 0;
    let hideTimer = 0;
    const tick = () => {
      const entry = chatBubbleMap.get(id);
      const alive = entry && entry.until > Date.now();
      const nextText = alive ? entry.text : null;
      if (nextText !== lastRef.current) {
        lastRef.current = nextText;
        setText(nextText);
        if (nextText) {
          clearTimeout(hideTimer);
          hideTimer = setTimeout(() => {
            lastRef.current = null;
            setText(null);
          }, BUBBLE_MS);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(hideTimer);
    };
  }, [id]);

  if (!text) return null;

  return (
    <Html center position={[0, 2.6, 0]} distanceFactor={12} zIndexRange={[25, 0]}>
      <div className="relative max-w-[180px] rounded-2xl border border-white/15 bg-[#171426]/85 px-3 py-1.5 text-[11px] leading-snug text-[#f5ebdd] shadow-lg backdrop-blur-md transition-opacity duration-200">
        {text}
        <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-white/15 bg-[#171426]/85" />
      </div>
    </Html>
  );
}
