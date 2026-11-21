import '../models/setupDraco';
import { useEffect, useMemo, useRef } from 'react';
import { useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';

const CACTORO_URL = '/game-models/opt/Cactoro.glb';
const MODEL_HEIGHT = 3.95; // ارتفاع مدل در واحدهای خودش
const TARGET_HEIGHT = 1.75; // قد نهایی بازیکن

// نگاشت اکشن‌های منطقی به کلیپ‌های مدل
const CLIP = {
  idle: 'CharacterArmature|Idle',
  walk: 'CharacterArmature|Walk',
  run: 'CharacterArmature|Run',
  wave: 'CharacterArmature|Wave',
  dance: 'CharacterArmature|Duck',
  laugh: 'CharacterArmature|Yes',
  celebrate: 'CharacterArmature|Jump',
  sleep: 'CharacterArmature|Death',
  guitar: 'CharacterArmature|Weapon',
  marshmallow: 'CharacterArmature|Punch',
  sit: 'CharacterArmature|Duck',
};

// ارتفاع نشستن: بدن خم‌شده روی کنده (ارتفاع کنده ≈ ۰.۵۳) می‌نشیند
const SEAT_OFFSET_Y = 0.38;

// هر prop می‌تواند مقدار ثابت، ref یا تابع getter باشد (برای آپدیت بدون re-render)
function resolve(value) {
  if (typeof value === 'function') return value();
  if (value && typeof value === 'object' && 'current' in value) return value.current;
  return value;
}

/**
 * کاراکتر بازیکن با مدل Cactoro + کنترل انیمیشن.
 * props:
 *  - moving / running: از سرعت واقعی
 *  - emote: 'wave' | 'dance' | 'laugh' | 'celebrate' | 'sleep'
 *  - action: 'guitar' | 'marshmallow'
 *  - seated: نشستن روی کنده
 */
export default function Character({
  moving = false,
  running = false,
  emote = null,
  action = null,
  seated = false,
  tint = null,
  ...props
}) {
  const groupRef = useRef(null);
  const { scene, animations } = useGLTF(CACTORO_URL);

  // کلون اسکلتی برای هر نمونه (مهم برای چند بازیکن)
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { actions, mixer } = useAnimations(animations, groupRef);

  const currentRef = useRef(null);

  // انتخاب و سوییچ کلیپ در هر فریم (بدون re-render)
  useFrame(() => {
    const isMoving = Boolean(resolve(moving));
    const isRunning = Boolean(resolve(running));
    const currentEmote = resolve(emote);
    const currentAction = resolve(action);
    const isSeated = Boolean(resolve(seated));

    let key = CLIP.idle;
    if (currentAction && CLIP[currentAction]) key = CLIP[currentAction];
    else if (currentEmote && CLIP[currentEmote]) key = CLIP[currentEmote];
    else if (isSeated) key = CLIP.sit;
    else if (isMoving) key = isRunning ? CLIP.run : CLIP.walk;

    const next = actions[key];
    if (!next || currentRef.current === next) return;

    const prev = currentRef.current;
    next.reset();
    next.setEffectiveWeight(1);
    next.fadeIn(0.22).play();
    if (prev && prev !== next) prev.fadeOut(0.22);
    currentRef.current = next;
  });

  // توقف انیمیشن‌ها هنگام unmount
  useEffect(() => {
    return () => {
      try {
        mixer?.stopAllAction();
      } catch {
        /* ignore */
      }
      currentRef.current = null;
    };
  }, [mixer]);

  // اعمال tint رنگی برای تمایز بازیکنان (روی متریال کپی‌شده)
  useEffect(() => {
    if (!tint) return;
    const color = new THREE.Color(tint);
    clone.traverse((child) => {
      if (!child.isMesh) return;
      child.material = child.material.clone();
      child.material.color.lerp(color, 0.45);
    });
  }, [clone, tint]);

  // نشستن: پایین آمدن مدل تا روی کنده بنشیند
  useFrame(() => {
    if (!groupRef.current) return;
    const targetY = resolve(seated) ? SEAT_OFFSET_Y : 0;
    groupRef.current.position.y += (targetY - groupRef.current.position.y) * 0.18;
  });

  const scale = TARGET_HEIGHT / MODEL_HEIGHT;

  return (
    <group ref={groupRef} {...props}>
      <group scale={scale} rotation={[0, 0, 0]}>
        <primitive object={clone} />
      </group>
    </group>
  );
}

useGLTF.preload(CACTORO_URL);
