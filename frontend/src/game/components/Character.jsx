import '../models/setupDraco';
import { useEffect, useMemo, useRef } from 'react';
import { useAnimations, useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import {
  CHARACTERS,
  DEFAULT_CHARACTER,
  CLIP_SUFFIX,
  TARGET_HEIGHT,
  characterUrl,
  getFacingOffset,
  getPropAnchor,
  getHeadAnchor,
} from '../models/characterConfig';
import { applyShirtTint, normalizeWardrobe } from '../models/wardrobeConfig';
import { useSettingsStore } from '../stores/useSettingsStore';
import HeldProps from './HeldProps';
import Hat, { Accessory } from './Hat';
import Glasses from './Glasses';

// هر prop می‌تواند مقدار ثابت، ref یا تابع getter باشد (آپدیت بدون re-render)
function resolve(value) {
  if (typeof value === 'function') return value();
  if (value && typeof value === 'object' && 'current' in value) return value.current;
  return value;
}

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// بدون کمد: هیچ آیتم و هیچ تینتی اعمال نمی‌شود (بازیکن ریموت قدیمی)
const NO_WARDROBE = {
  hat: 'none',
  face: 'none',
  accessory: 'none',
  shirt: { color: null, pattern: 'solid' },
};

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
  rest = null,
  squashRef = null,
  questProgress = null,
  wardrobe = null,
  castShadow = false,
  ...props
}) {
  const config = CHARACTERS[model] || CHARACTERS[DEFAULT_CHARACTER];
  const url = characterUrl(model);

  const groupRef = useRef(null);
  const innerRef = useRef(null);
  const facingRef = useRef(null);
  const headGroupRef = useRef(null);

  const { scene, animations } = useGLTF(url);
  const camera = useThree((s) => s.camera);

  // آفست جهت صورت؛ از استور خوانده می‌شود تا با Ctrl+Shift+F زنده قابل تنظیم باشد
  const facingOverrides = useSettingsStore((s) => s.facingOverrides);
  const facingOffset = getFacingOffset(model, facingOverrides);

  // کلون اسکلتی برای هر نمونه (مهم برای چند بازیکن)
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { actions, mixer } = useAnimations(animations, groupRef);

  const currentRef = useRef(null);

  // کلیپ هدف بر اساس وضعیت
  const pickClip = (isMoving, isRunning, currentEmote, currentAction, isSeated, currentRest) => {
    let key = 'idle';
    if (currentAction && CLIP_SUFFIX[currentAction]) key = currentAction;
    else if (currentEmote && CLIP_SUFFIX[currentEmote]) key = currentEmote;
    else if (isSeated && currentRest === 'sleep') key = 'sleep';
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
    const currentRest = resolve(rest);

    const key = pickClip(isMoving, isRunning, currentEmote, currentAction, isSeated, currentRest);
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

  // انیمیشن رویه‌ای برای مدل‌های بدون ریگ + افکت‌های مشترک (squash، پرش شادی، پلک)
  const baseY = useRef(0);
  const phase = useRef(0);
  const lookYaw = useRef(0);
  const hop = useRef(0);
  const blinkAt = useRef(0);
  const idleMode = useRef({ kind: '', until: 0 });
  const lastQuest = useRef(null);
  useEffect(() => {
    phase.current = Math.random() * Math.PI * 2;
    blinkAt.current = performance.now() + 1500 + Math.random() * 2500;
  }, []);

  useFrame(({ clock }) => {
    const inner = innerRef.current;
    if (!inner) return;

    const isSeated = Boolean(resolve(seated));
    const isMoving = Boolean(resolve(moving));
    const isRunning = Boolean(resolve(running));
    const currentEmote = resolve(emote);
    const currentAction = resolve(action);
    const currentRest = resolve(rest);

    // ---- squash/stretch: مقیاس کشسان از فیزیک پرش/فرود ----
    let squash = 1;
    if (squashRef && squashRef.current) {
      squash = clamp(squashRef.current.s ?? 1, 0.55, 1.6);
    }
    // ---- پلک زدن: پالس سریع ----
    const now = performance.now();
    let blinkMul = 1;
    if (now > blinkAt.current) {
      const since = now - blinkAt.current;
      if (since < 130) blinkMul = 1 - 0.07 * Math.sin((since / 130) * Math.PI);
      else blinkAt.current = now + 2600 + Math.random() * 3400;
    }
    const xz = 1 + (1 - squash) * 0.5;
    inner.scale.set(xz, squash * blinkMul, xz);

    // ---- پرش شادی وقتی مأموریت جلو می‌رود ----
    if (questProgress) {
      const progress = Number(questProgress()) || 0;
      if (lastQuest.current !== null && progress > lastQuest.current) hop.current = 1;
      lastQuest.current = progress;
    }
    if (hop.current > 0) hop.current = Math.max(0, hop.current - 0.02);

    // نشستن: پایین آمدن نرم
    const targetY = isSeated ? (currentRest === 'sleep' ? -0.1 : -0.35) : 0;
    baseY.current += (targetY - baseY.current) * 0.18;
    inner.position.y = baseY.current;

    if (config.clips) {
      // تکان سر ملایم هنگام راه رفتن برای مدل‌های ریگ‌دار
      const tRig = clock.elapsedTime + phase.current;
      const rigBob = isMoving ? Math.abs(Math.sin(tRig * (isRunning ? 11 : 7))) * 0.05 : 0;
      inner.position.y = baseY.current + rigBob + hop.current * 0.4;
      inner.rotation.x = 0;
      inner.rotation.z = 0;
      inner.rotation.y = 0;
      return;
    }

    const t = clock.elapsedTime + phase.current;
    let bob = Math.sin(t * 1.6) * 0.022;
    let tiltX = 0;
    let rollZ = 0;

    // ---- idle variations: کش‌آمدن، نگاه اطراف، خمیازه ----
    const idle = !isMoving && !currentEmote && !isSeated && !currentAction;
    if (idle) {
      if (now > idleMode.current.until) {
        const roll = Math.random();
        const kind = roll < 0.36 ? 'stretch' : roll < 0.7 ? 'lookAround' : 'yawn';
        idleMode.current = { kind, until: now + 3200 + Math.random() * 3200 };
      }
      const remaining = idleMode.current.until - now;
      if (remaining > 0) {
        const k = idleMode.current.kind;
        if (k === 'stretch') {
          const e = Math.sin((1 - remaining / 3200) * Math.PI);
          tiltX = -0.22 * e;
          bob += 0.06 * e;
        } else if (k === 'lookAround') {
          rollZ = Math.sin(t * 1.3) * 0.1;
        } else {
          tiltX = 0.16 + Math.sin(t * 2.2) * 0.05;
        }
      }
    } else {
      idleMode.current = { kind: '', until: 0 };
    }

    if (currentEmote === 'dance') {
      rollZ = Math.sin(t * 6) * 0.22;
      bob = Math.abs(Math.sin(t * 6)) * 0.16;
    } else if (currentEmote === 'wave') {
      rollZ = Math.sin(t * 5) * 0.12;
    } else if (currentEmote === 'laugh') {
      tiltX = Math.sin(t * 9) * 0.06;
      bob = Math.abs(Math.sin(t * 9)) * 0.05;
    } else if (currentEmote === 'celebrate' || currentEmote === 'cheer') {
      bob = Math.abs(Math.sin(t * 7)) * 0.32;
    } else if (currentEmote === 'highfive') {
      rollZ = Math.sin(t * 8) * 0.16;
      bob = Math.abs(Math.sin(t * 8)) * 0.1;
    } else if (currentEmote === 'hug') {
      tiltX = 0.24 + Math.sin(t * 3) * 0.05;
    } else if (currentEmote === 'sit') {
      tiltX = 0.05;
      bob = -0.28;
    } else if (currentEmote === 'sleep' || (isSeated && currentRest === 'sleep')) {
      tiltX = -1.15;
      bob = Math.sin(t * 1.2) * 0.015;
    } else if (isMoving) {
      const speed = isRunning ? 11 : 7;
      bob = Math.abs(Math.sin(t * speed)) * (isRunning ? 0.13 : 0.08);
      tiltX = isRunning ? 0.18 : 0.05;
      // تکان سر در راه رفتن
      rollZ = Math.sin(t * speed * 0.5) * 0.045;
    } else if (currentAction === 'guitar') {
      rollZ = Math.sin(t * 3.4) * 0.09;
    }

    // ---- نگاه به دوربین وقتی ایستاده و دوربین نزدیک است ----
    let yawTarget = 0;
    if (idle && groupRef.current) {
      const gp = groupRef.current.position;
      const dx = camera.position.x - gp.x;
      const dz = camera.position.z - gp.z;
      if (Math.hypot(dx, dz) < 7) {
        let a = Math.atan2(dx, dz) - groupRef.current.rotation.y - facingOffset;
        while (a > Math.PI) a -= Math.PI * 2;
        while (a < -Math.PI) a += Math.PI * 2;
        yawTarget = clamp(a, -0.7, 0.7);
      }
    }
    lookYaw.current += (yawTarget - lookYaw.current) * 0.08;
    inner.rotation.y = lookYaw.current;

    inner.position.y = baseY.current + bob + hop.current * 0.4;
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
  const headAnchor = getHeadAnchor(model);
  // wardrobe می‌تواند شیء ثابت یا getter باشد؛ کلید JSON از رندر تکراری جلوگیری می‌کند.
  // اگر کمد ارسال نشده باشد (بازیکن قدیمی)، هیچ آیتم/تینتی اعمال نمی‌شود.
  const wardrobeRaw = resolve(wardrobe);
  const wardrobeKey = wardrobeRaw ? JSON.stringify(normalizeWardrobe(wardrobeRaw)) : '';
  const wardrobeItems = useMemo(
    () => (wardrobeRaw ? normalizeWardrobe(wardrobeRaw) : NO_WARDROBE),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wardrobeKey]
  );

  // بون سر (اگر مدل اسکلت دارد) تا کلاه/عینک با انیمیشن سر حرکت کنند
  const headBone = useMemo(() => {
    if (!headAnchor.bone) return null;
    let found = null;
    clone.traverse((child) => {
      if (!found && child.isBone && child.name === headAnchor.bone) found = child;
    });
    if (!found) {
      clone.traverse((child) => {
        if (!found && child.isBone && child.name.toLowerCase().includes(headAnchor.bone.toLowerCase())) {
          found = child;
        }
      });
    }
    return found;
  }, [clone, headAnchor.bone]);

  // رنگ/بافت پیراهن روی تنه — فقط وقتی انتخاب پیراهن عوض شود
  const shirtKey = `${wardrobeItems.shirt.color}:${wardrobeItems.shirt.pattern}`;
  useEffect(() => {
    applyShirtTint(clone, config, wardrobeItems.shirt);
  }, [clone, config, shirtKey, wardrobeItems.shirt]);
  // دنبال کردن موقعیت جهانی بون سر هر فریم (بدون re-render)
  const headWorld = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const head = headGroupRef.current;
    const facing = facingRef.current;
    if (!head || !facing) return;
    if (!headBone) {
      head.position.set(0, headAnchor.y, headAnchor.z);
      return;
    }
    headBone.getWorldPosition(headWorld);
    facing.worldToLocal(headWorld);
    // بون Head معمولاً در گردن است؛ کمی بالا می‌رویم تا کلاه روی جمجمه بنشیند
    head.position.set(headWorld.x, headWorld.y + 0.18, headWorld.z + headAnchor.z);
  });

  return (
    <group ref={groupRef} {...props}>
      <group ref={innerRef} position={[0, lift, 0]}>
        {/* آفست جهت صورت جدا از yaw حرکت اعمال می‌شود تا هر دو مستقل بمانند */}
        <group ref={facingRef} rotation={[0, facingOffset, 0]}>
          <group scale={scale}>
            <primitive object={clone} />
          </group>
          {/* کلاه + عینک روی لنگر سر (بون Head یا آفست اندازه‌گیری‌شده) */}
          <group ref={headGroupRef} position={[0, headAnchor.y, headAnchor.z]} scale={headAnchor.scale}>
            <Hat value={wardrobeItems.hat} />
            <Glasses value={wardrobeItems.face} y={-0.14} />
          </group>
          <Accessory value={wardrobeItems.accessory} />
          {/* پروپ‌های در دست: گیتار / سیخ مارشمالو */}
          <HeldProps action={action} marshmallowStage={marshmallowStage} anchor={propAnchor} />
        </group>
      </group>
    </group>
  );
}

// پیش‌بارگذاری همه‌ی کاراکترها
Object.keys(CHARACTERS).forEach((file) => useGLTF.preload(characterUrl(file)));
