import '../models/setupDraco';
import { useEffect, useMemo, useRef } from 'react';
import { useAnimations, useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import {
  CHARACTER_IDS,
  DEFAULT_CHARACTER,
  CLIP_SUFFIX,
  TARGET_HEIGHT,
  characterUrl,
  getCharacterConfig,
  getFacingOffset,
  getPropAnchor,
  getWardrobeAnchors,
} from '../models/characterConfig';
import { applyShirtTint, normalizeWardrobe } from '../models/wardrobeConfig';
import { useSettingsStore } from '../stores/useSettingsStore';
import { eatWorld, EAT_DURATION } from '../eatData';
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

// خرده‌های نان/درخشش هنگام خوردن: ۸ ذره‌ی کوچک که با یک موج کوتاه بیرون
// می‌پرند. هندسه/متریال یک‌بار ساخته می‌شود و فقط موقعیت/اپسیتی آپدیت می‌شود.
const CRUMB_COUNT = 8;
const CRUMB_LIFE = 0.75;

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
  crumbs = false,
  ...props
}) {
  const config = getCharacterConfig(model);
  const url = characterUrl(model);
  // آیا مدل کلیپ واقعی دارد؟ (idle/walk/run از config می‌آیند، بقیه از CLIP_SUFFIX)
  const animMode = config.animations?.mode || 'procedural';
  const hasClips = animMode === 'clips' || animMode === 'hybrid';

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

  // نام کلیپ برای یک اکشن: اول از animationMap کاراکتر، بعد CLIP_SUFFIX، بعد idle
  const clipFor = (key) => {
    const map = config.animations || {};
    if (key === 'idle' && map.idle) return map.idle;
    if (key === 'walk' && map.walk) return map.walk;
    if (key === 'run' && map.run) return map.run;
    const suffix = config.clipOverrides?.[key] || CLIP_SUFFIX[key];
    return `${config.clipPrefix || ''}${suffix}`;
  };

  // سوییچ کلیپ برای مدل‌های ریگ‌دار/کلیپ‌دار
  useFrame(() => {
    if (!hasClips || !actions) return;
    const isMoving = Boolean(resolve(moving));
    const isRunning = Boolean(resolve(running));
    const currentEmote = resolve(emote);
    const currentAction = resolve(action);
    const isSeated = Boolean(resolve(seated));
    const currentRest = resolve(rest);

    const key = pickClip(isMoving, isRunning, currentEmote, currentAction, isSeated, currentRest);
    const clipName = clipFor(key);
    // اگر کلیپ موردنظر نبود، به idle برگرد
    const next = actions[clipName] || actions[clipFor('idle')];
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
  // زمان شروع انیمیشن خوردن — per-character، پس برای ریموت‌ها هم درست کار می‌کند
  const eatStartRef = useRef(0);
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

    if (animMode === 'clips') {
      // تکان سر ملایم هنگام راه رفتن برای مدل‌های ریگ‌دار
      const tRig = clock.elapsedTime + phase.current;
      const rigBob = isMoving ? Math.abs(Math.sin(tRig * (isRunning ? 11 : 7))) * 0.05 : 0;
      // خوردن روی مدل‌های ریگ‌دار: تکان فک/تنه‌ی کوتاه
      let eatTilt = 0;
      if (currentAction === 'eating') {
        if (!eatStartRef.current) eatStartRef.current = now;
        const pRig = Math.min(1, (now - eatStartRef.current) / EAT_DURATION);
        eatTilt = Math.abs(Math.sin(pRig * Math.PI * 3)) * 0.07;
      } else if (eatStartRef.current) {
        eatStartRef.current = 0;
      }
      inner.position.y = baseY.current + rigBob + hop.current * 0.4;
      inner.rotation.x = eatTilt;
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
    } else if (currentAction === 'cooking-stir') {
      // هم زدن دیگ: چرخش ملایم تنه + بالا-پایین + حرکت دایره‌ای دست
      const stir = t * 4.2;
      rollZ = Math.sin(stir) * 0.11;
      tiltX = 0.12 + Math.cos(stir) * 0.02;
      bob = Math.abs(Math.sin(stir)) * 0.02;
    } else if (currentAction === 'cooking-flip') {
      // برگرداندن در ماهیتابه: تکان تندتر مچ/تنه + جهش کوچک هم‌گام
      const flip = t * 7.5;
      rollZ = Math.sin(flip) * 0.13;
      tiltX = 0.08 + Math.abs(Math.sin(flip)) * 0.04;
      bob = Math.abs(Math.sin(flip)) * 0.035;
    } else if (currentAction === 'fishing-hold') {
      // ماهیگیری: خم شدن ملایم به جلو + تکان آرام چوب
      tiltX = 0.16 + Math.sin(t * 1.8) * 0.03;
      rollZ = Math.sin(t * 1.4) * 0.03;
      bob = Math.sin(t * 1.6) * 0.015;
    } else if (currentAction === 'bug-catch') {
      // گرفتن حشره: تاب دادن تور
      tiltX = 0.14 + Math.sin(t * 9) * 0.12;
      rollZ = Math.sin(t * 9) * 0.1;
      bob = Math.abs(Math.sin(t * 9)) * 0.03;
    } else if (currentAction === 'forage-pick') {
      // چیدن گیاه: خم شدن به جلو و دست بردن به زمین
      const e = Math.sin(t * 4) * 0.5 + 0.5;
      tiltX = 0.34 + e * 0.12;
      bob = -0.1 - e * 0.05;
      rollZ = Math.sin(t * 4) * 0.05;
    }

    // ---- خوردن: لقمه گرفتن، جویدن، سر خوشحال بالا ----
    // از روی اکشن خوانده می‌شود (نه وضعیت سراسری) تا فقط همان کاراکتری که
    // واقعاً می‌خورد این pose را بگیرد — چه local چه remote.
    if (currentAction === 'eating') {
      // شروع تازه‌ی انیمیشن را با تغییر اکشن تشخیص بده
      if (!eatStartRef.current) eatStartRef.current = now;
      const p = Math.min(1, (now - eatStartRef.current) / EAT_DURATION);
      // ۳ لقمه در طول انیمیشن؛ هر لقمه یک موج سریع فک
      const biteWave = Math.abs(Math.sin(p * Math.PI * 3));
      tiltX = 0.12 + biteWave * 0.07;
      bob += Math.sin(p * Math.PI * 3) * 0.02;
      // در نیمه‌ی دوم، سر شاد بالا می‌رود
      if (p > 0.55) {
        const happy = (p - 0.55) / 0.45;
        bob += Math.sin(happy * Math.PI) * 0.05;
        tiltX -= Math.sin(happy * Math.PI) * 0.1;
      }
      rollZ += Math.sin(p * Math.PI * 2) * 0.03;
    } else if (eatStartRef.current) {
      eatStartRef.current = 0;
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
  // groundOffset از بازرسی هر مدل می‌آید تا پاها دقیقاً روی y=0 بنشینند
  const lift = Number.isFinite(config.groundOffset) ? config.groundOffset : -(config.minY || 0) * scale;
  // لنگر پروپ مخصوص همین مدل (نسبت سر/بدن هر کاراکتر فرق دارد)
  const propAnchor = getPropAnchor(model);
  const wardrobeAnchors = getWardrobeAnchors(model);
  // wardrobe می‌تواند شیء ثابت یا getter باشد؛ کلید JSON از رندر تکراری جلوگیری می‌کند.
  // اگر کمد ارسال نشده باشد (بازیکن قدیمی)، هیچ آیتم/تینتی اعمال نمی‌شود.
  const wardrobeRaw = resolve(wardrobe);
  const wardrobeKey = wardrobeRaw ? JSON.stringify(normalizeWardrobe(wardrobeRaw)) : '';
  const wardrobeItems = useMemo(
    () => (wardrobeRaw ? normalizeWardrobe(wardrobeRaw) : NO_WARDROBE),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wardrobeKey]
  );

  // لنگرهای کمد هر کاراکتر (bone + offset + scale) — از characterReport.json
  const hatAnchor = wardrobeAnchors.hat;
  const glassesAnchor = wardrobeAnchors.glasses;
  const backpackAnchor = wardrobeAnchors.backpack;
  // اختلاف عینک نسبت به کلاه، داخل گروه مقیاس‌شده‌ی سر
  const headScale = hatAnchor.scale || 1;
  const glassesLocalY = (glassesAnchor.y - hatAnchor.y) / headScale;
  const glassesLocalZ = (glassesAnchor.z - hatAnchor.z) / headScale;

  // بون سر (اگر مدل اسکلت دارد) تا کلاه/عینک با انیمیشن سر حرکت کنند
  const headBone = useMemo(() => {
    const boneName = hatAnchor.bone || glassesAnchor.bone;
    if (!boneName) return null;
    let found = null;
    clone.traverse((child) => {
      if (!found && child.isBone && child.name === boneName) found = child;
    });
    if (!found) {
      clone.traverse((child) => {
        if (!found && child.isBone && child.name.toLowerCase().includes(boneName.toLowerCase())) {
          found = child;
        }
      });
    }
    return found;
  }, [clone, hatAnchor.bone, glassesAnchor.bone]);

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
      head.position.set(hatAnchor.x || 0, hatAnchor.y, hatAnchor.z || 0);
      return;
    }
    headBone.getWorldPosition(headWorld);
    facing.worldToLocal(headWorld);
    // بون Head معمولاً در گردن است؛ کمی بالا می‌رویم تا کلاه روی جمجمه بنشیند
    head.position.set(headWorld.x, headWorld.y + 0.18, headWorld.z + (hatAnchor.z || 0));
  });

  // ---- ذرات خرده‌ی خوردن: یک InstancedMesh کوچک، صفر تخصیص در هر فریم ----
  const crumbsRef = useRef(null);
  const crumbState = useRef({ burst: 0, seeds: null });
  const crumbGeo = useMemo(() => new THREE.BoxGeometry(0.045, 0.045, 0.045), []);
  const crumbMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#f0c987', transparent: true, opacity: 0.85, depthWrite: false }),
    []
  );
  const crumbDummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    const mesh = crumbsRef.current;
    if (!mesh) return;
    // خرده‌ها فقط برای کاراکتر محلی (eatWorld سراسری است)
    if (!crumbs) {
      mesh.visible = false;
      return;
    }
    const st = crumbState.current;
    // موج جدید؟ بذرهای تصادفی تازه بساز
    if (eatWorld.crumbBurst !== st.burst) {
      st.burst = eatWorld.crumbBurst;
      st.seeds = Array.from({ length: CRUMB_COUNT }, () => ({
        a: Math.random() * Math.PI * 2,
        r: 0.06 + Math.random() * 0.1,
        vy: 0.7 + Math.random() * 0.7,
        spin: (Math.random() - 0.5) * 8,
        size: 0.6 + Math.random() * 0.8,
      }));
      st.t0 = clock.elapsedTime;
    }
    const age = st.seeds ? clock.elapsedTime - (st.t0 ?? 0) : Infinity;
    if (!st.seeds || age > CRUMB_LIFE) {
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    const k = age / CRUMB_LIFE;
    const lift = 1.15;
    for (let i = 0; i < CRUMB_COUNT; i += 1) {
      const s = st.seeds[i];
      const spread = 0.12 + k * 0.34;
      crumbDummy.position.set(
        Math.sin(s.a) * spread * (1 + i * 0.02),
        lift + s.vy * age - 2.2 * age * age,
        Math.cos(s.a) * spread * (1 + i * 0.02)
      );
      crumbDummy.rotation.set(s.spin * age, s.spin * age * 0.7, s.spin * age * 0.4);
      crumbDummy.scale.setScalar(Math.max(0.0001, s.size * (1 - k)));
      crumbDummy.updateMatrix();
      mesh.setMatrixAt(i, crumbDummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
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
          <group
            ref={headGroupRef}
            position={[hatAnchor.x || 0, hatAnchor.y, hatAnchor.z || 0]}
            scale={hatAnchor.scale || 1}
          >
            <Hat value={wardrobeItems.hat} />
            <Glasses value={wardrobeItems.face} y={glassesLocalY} z={glassesLocalZ} />
          </group>
          <Accessory
            value={wardrobeItems.accessory}
            anchor={backpackAnchor}
            fallback={config.fallbackAnchors?.backpack}
          />
          {/* پروپ‌های در دست: گیتار / سیخ مارشمالو */}
          <HeldProps action={action} marshmallowStage={marshmallowStage} anchor={propAnchor} />
          {/* خرده‌های خوردن (فقط هنگام خوردن دیده می‌شود) */}
          <instancedMesh
            ref={crumbsRef}
            args={[crumbGeo, crumbMat, CRUMB_COUNT]}
            visible={false}
            frustumCulled={false}
          />
        </group>
      </group>
    </group>
  );
}

// پیش‌بارگذاری همه‌ی کاراکترها
CHARACTER_IDS.forEach((id) => useGLTF.preload(characterUrl(id)));
