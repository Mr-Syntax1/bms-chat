import '../models/setupDraco';
import { useEffect, useMemo, useRef } from 'react';
import { useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { SkeletonUtils } from 'three-stdlib';
import {
  CHARACTERS,
  DEFAULT_CHARACTER,
  CLIP_SUFFIX,
  TARGET_HEIGHT,
  characterUrl,
  getFacingOffset,
  getPropAnchor,
} from '../models/characterConfig';
import { useSettingsStore } from '../stores/useSettingsStore';
import HeldProps from './HeldProps';

// هر prop می‌تواند مقدار ثابت، ref یا تابع getter باشد (آپدیت بدون re-render)
function resolve(value) {
  if (typeof value === 'function') return value();
  if (value && typeof value === 'object' && 'current' in value) return value.current;
  return value;
}

/**
 * کاراکتر بازیکن با هر یک از ۹ مدل اختصاص‌یافته.
 * مدل‌های دارای ریگ از کلیپ‌های خودشان استفاده می‌کنند؛
 * بقیه انیمیشن رویه‌ای (bob، tilt، پرش ایموت) می‌گیرند.
 */
export default function Character({
  model = DEFAULT_CHARACTER,
  moving = false,
  running = false,
  emote = null,
  action = null,
  marshmallowStage = null,
  seated = false,
  castShadow = false,
  ...props
}) {
  const config = CHARACTERS[model] || CHARACTERS[DEFAULT_CHARACTER];
  const url = characterUrl(model);

  const groupRef = useRef(null);
  const innerRef = useRef(null);
  const { scene, animations } = useGLTF(url);

  // آفست جهت صورت؛ از استور خوانده می‌شود تا با Ctrl+Shift+F زنده قابل تنظیم باشد
  const facingOverrides = useSettingsStore((s) => s.facingOverrides);
  const facingOffset = getFacingOffset(model, facingOverrides);

  // کلون اسکلتی برای هر نمونه (مهم برای چند بازیکن)
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { actions, mixer } = useAnimations(animations, groupRef);

  const currentRef = useRef(null);

  // کلیپ هدف بر اساس وضعیت
  const pickClip = (isMoving, isRunning, currentEmote, currentAction, isSeated) => {
    let key = 'idle';
    if (currentAction && CLIP_SUFFIX[currentAction]) key = currentAction;
    else if (currentEmote && CLIP_SUFFIX[currentEmote]) key = currentEmote;
    else if (isSeated) key = 'sit';
    else if (isMoving) key = isRunning ? 'run' : 'walk';
    return key;
  };

  // سوییچ کلیپ برای مدل‌های ریگ‌دار
  useFrame(() => {
    if (!config.clips || !actions) return;
    const isMoving = Boolean(resolve(moving));
    const isRunning = Boolean(resolve(running));
    const currentEmote = resolve(emote);
    const currentAction = resolve(action);
    const isSeated = Boolean(resolve(seated));

    const key = pickClip(isMoving, isRunning, currentEmote, currentAction, isSeated);
    const suffix = config.clipOverrides?.[key] || CLIP_SUFFIX[key];
    const clipName = `${config.prefix || ''}${suffix}`;
    // اگر کلیپ موردنظر نبود، به idle برگرد
    const next =
      actions[clipName] ||
      actions[`${config.prefix || ''}${config.clipOverrides?.idle || CLIP_SUFFIX.idle}`];
    if (!next || currentRef.current === next) return;

    const prev = currentRef.current;
    next.reset();
    next.setEffectiveWeight(1);
    next.fadeIn(0.22).play();
    if (prev && prev !== next) prev.fadeOut(0.22);
    currentRef.current = next;
  });

  // انیمیشن رویه‌ای برای مدل‌های بدون ریگ
  const baseY = useRef(0);
  const phase = useRef(0);
  useEffect(() => {
    phase.current = Math.random() * Math.PI * 2;
  }, []);
  useFrame(({ clock }) => {
    const inner = innerRef.current;
    if (!inner) return;

    const isSeated = Boolean(resolve(seated));
    const isMoving = Boolean(resolve(moving));
    const isRunning = Boolean(resolve(running));
    const currentEmote = resolve(emote);
    const currentAction = resolve(action);

    // نشستن: پایین آمدن نرم
    const targetY = isSeated ? -0.35 : 0;
    baseY.current += (targetY - baseY.current) * 0.18;
    inner.position.y = baseY.current;

    if (config.clips) {
      inner.rotation.x = 0;
      inner.rotation.z = 0;
      return;
    }

    const t = clock.elapsedTime + phase.current;
    let bob = 0;
    let tiltX = 0;
    let rollZ = 0;

    if (currentEmote === 'dance') {
      rollZ = Math.sin(t * 6) * 0.22;
      bob = Math.abs(Math.sin(t * 6)) * 0.16;
    } else if (currentEmote === 'wave') {
      rollZ = Math.sin(t * 5) * 0.12;
    } else if (currentEmote === 'laugh') {
      tiltX = Math.sin(t * 9) * 0.06;
      bob = Math.abs(Math.sin(t * 9)) * 0.05;
    } else if (currentEmote === 'celebrate') {
      bob = Math.abs(Math.sin(t * 7)) * 0.32;
    } else if (currentEmote === 'sleep') {
      tiltX = 0.28;
      bob = Math.sin(t * 1.2) * 0.02;
    } else if (isMoving) {
      const speed = isRunning ? 11 : 7;
      bob = Math.abs(Math.sin(t * speed)) * (isRunning ? 0.13 : 0.08);
      tiltX = isRunning ? 0.18 : 0.05;
    } else if (currentAction === 'guitar') {
      rollZ = Math.sin(t * 3.4) * 0.09;
    } else {
      // نفس کشیدن ملایم در idle
      bob = Math.sin(t * 1.6) * 0.022;
    }

    inner.position.y = baseY.current + bob;
    inner.rotation.x = tiltX;
    inner.rotation.z = rollZ;
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

  // سایه
  useEffect(() => {
    if (!castShadow) return;
    clone.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });
  }, [clone, castShadow]);

  // مقیاس و آفست عمودی بر اساس ارتفاع واقعی مدل
  const scale = TARGET_HEIGHT / config.height;
  const lift = -(config.minY || 0) * scale;
  // لنگر پروپ مخصوص همین مدل (نسبت سر/بدن هر کاراکتر فرق دارد)
  const propAnchor = getPropAnchor(model);

  return (
    <group ref={groupRef} {...props}>
      <group ref={innerRef} position={[0, lift, 0]}>
        {/* آفست جهت صورت جدا از yaw حرکت اعمال می‌شود تا هر دو مستقل بمانند */}
        <group rotation={[0, facingOffset, 0]}>
          <group scale={scale}>
            <primitive object={clone} />
          </group>
          {/* پروپ‌های در دست: گیتار / سیخ مارشمالو */}
          <HeldProps action={action} marshmallowStage={marshmallowStage} anchor={propAnchor} />
        </group>
      </group>
    </group>
  );
}

// پیش‌بارگذاری همه‌ی کاراکترها
Object.keys(CHARACTERS).forEach((file) => useGLTF.preload(characterUrl(file)));
