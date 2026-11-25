import { Suspense, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import Character from '../components/Character';
import { CHARACTERS, DEFAULT_CHARACTER } from '../models/characterConfig';
import {
  CHARACTER_LABELS,
  loadPreferredCharacter,
  savePreferredCharacter,
} from '../models/wardrobeConfig';
import { PrimaryButton } from './primitives';
import { GameIcon } from './icons';

// آیکون هر کاراکتر برای کارت انتخاب
const CHARACTER_ICONS = {
  'Cactoro.glb': 'cactus',
  'Citizen.glb': 'person',
  'CoolBannanaGuy.glb': 'banana',
  'CubeGuyCharacter.glb': 'cube',
  'CuteCharacter.glb': 'chick',
  'CuteRedDino.glb': 'dino',
  'DORAEMON.glb': 'cat',
  'miku.glb': 'mic',
  'MushroomCharacter.glb': 'mushroom',
};

const FILES = Object.keys(CHARACTERS);

// گروه چرخان برای پیش‌نمایش زنده — چرخش بیرون از React
function Turntable({ children }) {
  const ref = useRef(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.55;
  });
  return <group ref={ref}>{children}</group>;
}

/** پیش‌نمایش سه‌بعدی کوچک از یک کاراکتر با لباس دلخواه (مشترک با کمد). */
export function CharacterPreview({ model, wardrobe = null, className = '' }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d0b16] ${className}`}>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 1.5, 3.4], fov: 45, near: 0.1, far: 40 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={1.15} />
        <directionalLight position={[2.5, 4, 3]} intensity={1.7} />
        <directionalLight position={[-3, 2, -2]} intensity={0.6} color="#9db8ff" />
        <Suspense fallback={null}>
          <Turntable>
            <Character model={model} wardrobe={wardrobe} castShadow />
          </Turntable>
        </Suspense>
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0d0b16] to-transparent" />
    </div>
  );
}

/**
 * انتخاب کاراکتر پیش از بازی — گرید ۹ کاراکتر + پیش‌نمایش سه‌بعدی زنده.
 * انتخاب در localStorage ذخیره می‌شود و به claim-character می‌رسد.
 */
export default function CharacterSelector({ open = true, onConfirm }) {
  const [selected, setSelected] = useState(() => {
    const saved = loadPreferredCharacter();
    return CHARACTERS[saved] ? saved : DEFAULT_CHARACTER;
  });

  const label = useMemo(() => CHARACTER_LABELS[selected] || selected, [selected]);

  if (!open) return null;

  const confirm = () => {
    savePreferredCharacter(selected);
    onConfirm?.(selected);
  };

  return (
    <div className="fixed inset-0 z-[95] flex flex-col items-center justify-center overflow-y-auto bg-[#0d0b16]/92 p-4 backdrop-blur-md">
      <div className="w-full max-w-3xl">
        <h2 className="mb-1 text-center text-lg font-extrabold text-[#f5ebdd]">کاراکترت را انتخاب کن</h2>
        <p className="mb-4 text-center text-[11px] text-[#f5ebdd]/50">
          اگر کاراکتر انتخابی توسط بازیکن دیگری گرفته شده باشد، یک کاراکتر آزاد تصادفی می‌گیری.
        </p>

        <div className="grid gap-4 sm:grid-cols-[1fr_260px]">
          {/* گرید کاراکترها */}
          <div className="grid grid-cols-3 gap-2">
            {FILES.map((file) => {
              const active = file === selected;
              return (
                <button
                  key={file}
                  type="button"
                  onClick={() => setSelected(file)}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border px-1 py-3 transition-all ${
                    active
                      ? 'border-[#ffc66d]/70 bg-[#ff9a4d]/18 text-[#fff4e4] shadow-[0_0_16px_rgba(255,154,77,0.35)]'
                      : 'border-white/10 bg-white/[0.03] text-[#f5ebdd]/70 hover:bg-white/[0.08]'
                  }`}
                >
                  <GameIcon name={CHARACTER_ICONS[file] || 'person'} className="h-6 w-6" strokeWidth={1.6} />
                  <span className="text-[10px] font-bold">{CHARACTER_LABELS[file] || file}</span>
                </button>
              );
            })}
          </div>

          {/* پیش‌نمایش زنده */}
          <div className="flex flex-col gap-2">
            <CharacterPreview model={selected} className="h-[230px] w-full" />
            <div className="text-center text-[12px] font-bold text-[#ffc66d]">{label}</div>
            <PrimaryButton className="w-full" onClick={confirm}>
              ادامه با این کاراکتر
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
