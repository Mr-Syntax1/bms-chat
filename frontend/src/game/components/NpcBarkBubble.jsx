// ---------------------------------------------------------------------------
// NpcBarkBubble.jsx — حباب گفتار محیطی NPC با افکت تایپ‌رایتر (Phase 4.5)
//
//  • نسخه‌ی سبک‌شده‌ی DialogueBox است: بدون گزینه، بدون قفل موس، بالای سر NPC.
//  • تایپ‌رایتر از الگوی DialogueBox (۳۰ms/کاراکتر) استفاده می‌کند.
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '../stores/usePlayerStore';

const TYPE_SPEED = 34;

export default function NpcBarkBubble({ text, accent, until }) {
  const [typed, setTyped] = useState('');
  const timerRef = useRef(null);
  const clearNpcBark = usePlayerStore((s) => s.clearNpcBark);

  useEffect(() => {
    const full = text || '';
    let i = 0;
    timerRef.current = setInterval(() => {
      i += 1;
      setTyped(full.slice(0, i));
      if (i >= full.length && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, TYPE_SPEED);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [text]);

  // پاک‌سازی پس از پایان مدت (بیرون از چرخه‌ی رندر)
  useEffect(() => {
    const ms = Math.max(600, (until || Date.now()) - Date.now());
    const id = setTimeout(() => clearNpcBark(), ms);
    return () => clearTimeout(id);
  }, [until, clearNpcBark]);

  return (
    <div className="pointer-events-none mb-1 max-w-[190px] select-none rounded-xl border border-white/12 bg-[#171426]/88 px-2.5 py-1.5 text-[10.5px] leading-relaxed text-[#f5ebdd]/90 shadow-lg backdrop-blur-md cozy-pop-in">
      <span className="mb-0.5 block h-0.5 w-4 rounded-full" style={{ backgroundColor: accent }} />
      {typed}
      {typed.length < (text || '').length && (
        <span className="ml-0.5 inline-block w-1 animate-pulse bg-[#ffc66d]/70">&nbsp;</span>
      )}
    </div>
  );
}
