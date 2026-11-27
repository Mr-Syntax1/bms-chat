import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { FIRE_KEEPOUT, SEAT_RADIUS, SEAT_SPOTS, VAN, BOUNDS } from '../sceneLayout';
import { usePlayerStore, remoteMap, totalQuestProgress } from '../stores/usePlayerStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getNearbyTrees } from '../activeTrees';
import {
  getInteractables,
  resolveInteractableKey,
  findNearbyRestSpot,
  findNearbyCookingStation,
  findNearbyFishingSpot,
  findNearbyNpc,
} from '../interactionRegistry';
import { findNearbyQuestItem } from '../questRegistry';
import { getQuestTarget } from '../questSteps';
import { playPositionalOneShot } from '../audio';
import { publishPlayerAction } from '../hooks/useGameSync';
import { stepPlayerPhysics, resetPlayerPhysics, slopeSlide, getPlayerPhysics } from '../hooks/usePlayerMotion';
import { getWalkSurfaceY, isInWater } from '../terrain';
import { applyFovKick } from '../cameraTuning';
import { applyJuice, kickShake, kickPunch } from '../juice';
import { emitPickup } from '../pickupFX';
import { fishing } from '../fishData';
import { nearestBugDistance, tryCatchBug } from '../bugData';
import { findNearestForage, tryPickForage } from '../forageData';
import { setEatPublisher, EAT_DURATION } from '../eatData';
import { isNight } from '../envState';
import Character from './Character';
import ChatBubble from './ChatBubble';
import {
  GUITAR_SOUNDS,
  YUM_SOUND,
  BUG_NET_SOUND,
  BUG_CATCH_SOUND,
  BERRY_PICK_SOUND,
} from '../sounds';

const WALK_SPEED = 3.6;
const RUN_SPEED = 6.8;
const ACCEL = 14;
const DAMPING = 12;
const TURN_LERP = 0.2;
const BODY_RADIUS = 0.42;
const GUITAR_DURATION = 6000;
const MARSHMALLOW_DURATION = 3000;
const MARSHMALLOW_READY_HOLD = 4000;
const EMOTE_DURATION = 3400;
// برد تعامل هدفمند با بازیکن نزدیک (E)
const TARGET_RANGE = 2.5;

// دوربین سوم‌شخص نزدیک
const CAM_DIST = 2.5;
const CAM_HEIGHT = 1.5;
const CAM_LERP = 0.1;
// نمونه‌های بوکه‌ی دوربین برای برخورد با زمین/درخت
const CAM_SAMPLES = 6;
const CAM_MIN_DIST = 0.75;

// ایموت‌های چرخ (Q) از EmoteWheel می‌آیند؛ 1..5 همچنان میان‌بر است
const EMOTES = {
  Digit1: 'wave',
  Digit2: 'dance',
  Digit3: 'laugh',
  Digit4: 'cheer',
  Digit5: 'sleep',
};

// بافر جهت سُر خوردن روی شیب — module-level تا در رندر re-allocate نشود
const slideDir = { x: 0, z: 0 };

// کنترلر بازیکن محلی: WASD نسبت به جهت نگاه، کالیژن، دوربین سوم‌شخص، اکشن‌ها
export default function PlayerController({ roomId, user, look, active = true }) {
  const { camera } = useThree();
  const groupRef = useRef(null);
  const [, getKeys] = useKeyboardControls();

  // فعال بودن بازی (بعد از Start و تا وقتی موس قفل است) بدون re-render در حلقه
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const velocity = useRef(new THREE.Vector3());
  const raycaster = useRef(new THREE.Raycaster());
  const rayOrigin = useMemo(() => new THREE.Vector3(), []);
  const rayDirection = useMemo(() => new THREE.Vector3(), []);
  const smoothLook = useRef(new THREE.Vector3(0, 1.5, 10.5));
  const lookTarget = useMemo(() => new THREE.Vector3(), []);
  const desiredCam = useRef(new THREE.Vector3());
  const raycastTimer = useRef(0);
  const movingRef = useRef(false);
  const runningRef = useRef(false);
  const debugTimer = useRef(0);
  // squash/stretch پرش: بیرون از React، فقط یک شیء mutable
  const squashRef = useRef({ s: 1 });
  // بافر ثابت برای کوئری گرید درختان (بدون تخصیص در هر فریم)
  const treeBuf = useMemo(() => [], []);

  const guitarTimer = useRef(null);
  const marshmallowTimer = useRef(null);
  const emoteTimer = useRef(null);
  const bugTimer = useRef(null);
  const forageTimer = useRef(null);

  // ---- حالت دیباگ جهت کاراکتر (Ctrl+Shift+F) ----
  const debugRef = useRef({ enabled: false, lastPrint: 0 });
  useEffect(() => {
    const onKeyDown = (event) => {
      // Ctrl+Shift+F: روشن/خاموش کردن نمایش دیباگ
      if (event.ctrlKey && event.shiftKey && event.code === 'KeyF') {
        event.preventDefault();
        debugRef.current.enabled = !debugRef.current.enabled;
        usePlayerStore.getState().setFacingDebug(
          debugRef.current.enabled
            ? { yaw: 0, offset: 0, final: 0, model: '', dir: 0 }
            : null
        );
        return;
      }
      if (!debugRef.current.enabled) return;
      // [ و ] برای تنظیم زنده‌ی آفست مدل فعلی (گام ۱۵ درجه)
      const step = event.shiftKey ? Math.PI / 12 : Math.PI / 36;
      if (event.code !== 'BracketLeft' && event.code !== 'BracketRight') return;
      const { character } = usePlayerStore.getState();
      const settings = useSettingsStore.getState();
      const current = settings.facingOverrides[character] ?? 0;
      const next = current + (event.code === 'BracketRight' ? step : -step);
      settings.setFacingOverride(character, next);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const setLocalTransform = usePlayerStore((s) => s.setLocalTransform);
  const setNearFire = usePlayerStore((s) => s.setNearFire);
  const setHovered = usePlayerStore((s) => s.setHovered);
  const setNearInteractable = usePlayerStore((s) => s.setNearInteractable);
  const setQuestDistance = usePlayerStore((s) => s.setQuestDistance);
  const seated = usePlayerStore((s) => s.seated);
  const rest = usePlayerStore((s) => s.rest);
  const emote = usePlayerStore((s) => s.emote);
  const action = usePlayerStore((s) => s.action);
  const character = usePlayerStore((s) => s.character);
  const wardrobe = usePlayerStore((s) => s.wardrobe);
  const local = usePlayerStore((s) => s.local);

  // خوردن غذا از منوی دفترچه: انتشار اکشن برای ریموت‌ها (roomId/user اینجاست)
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  useEffect(() => {
    setEatPublisher(() => {
      publishPlayerAction(roomId, userRef.current, 'action', { action: 'eating', duration: EAT_DURATION });
      setTimeout(() => publishPlayerAction(roomId, userRef.current, 'action-end'), EAT_DURATION);
    });
    return () => setEatPublisher(null);
  }, [roomId]);

  // کلیدهای تعاملی: E تعامل، F چراغ ون، G گیتار، M مارشمالو، 1..5 ایموت
  useEffect(() => {
    const clearTimers = () => {
      if (guitarTimer.current) clearTimeout(guitarTimer.current);
      if (marshmallowTimer.current) clearTimeout(marshmallowTimer.current);
      if (emoteTimer.current) clearTimeout(emoteTimer.current);
      if (bugTimer.current) clearTimeout(bugTimer.current);
      if (forageTimer.current) clearTimeout(forageTimer.current);
      guitarTimer.current = null;
      marshmallowTimer.current = null;
      emoteTimer.current = null;
      bugTimer.current = null;
      forageTimer.current = null;
    };

    // تایمرهای اکشن قبلی را می‌بندد تا با شروع اکشن جدید،
    // رویداد کهنه (مثل yum بعد از گیتار) برای بازیکنان دیگر ارسال نشود
    const cancelPendingAction = (state) => {
      const hadAction = Boolean(state.action);
      if (guitarTimer.current) clearTimeout(guitarTimer.current);
      if (marshmallowTimer.current) clearTimeout(marshmallowTimer.current);
      if (bugTimer.current) clearTimeout(bugTimer.current);
      if (forageTimer.current) clearTimeout(forageTimer.current);
      guitarTimer.current = null;
      marshmallowTimer.current = null;
      bugTimer.current = null;
      forageTimer.current = null;
      if (hadAction) {
        state.endAction();
        publishPlayerAction(roomId, user, 'action-end');
      }
    };

    const onKeyDown = (event) => {
      if (event.repeat) return;
      // کلیدهای بازی فقط وقتی فعال است (Start خورده و در حالت بازی)
      if (!activeRef.current) return;
      const state = usePlayerStore.getState();
      // در حالت چیدمان کمپ، کلیدهای بازی غیرفعال‌اند (Q/E چرخش، کلیک جای‌گذاری)
      if (state.decorMode) return;
      const { x, z } = state.local;

      switch (event.code) {
        case 'KeyE': {
          event.preventDefault();
          // وقتی مینی‌گیم ماهیگیری باز است، E مخصوص FishingUI است
          if (fishing.active || fishing.phase === 'result') break;
          // آیتم قفل‌شده (ترتیب مأموریت) اجرا نمی‌شود
          if (state.nearInteractable?.locked) {
            state.pushToast('این مرحله هنوز قفل است!', 'warn');
            break;
          }
          // اولویت: آیتم تعاملی → بازیکن نزدیک (تعامل هدفمند) → نشستن روی کنده
          if (state.nearInteractable?.action) {
            state.nearInteractable.action();
            break;
          }
          let bestId = null;
          let bestDist = TARGET_RANGE;
          for (const [id, entry] of remoteMap) {
            const d = Math.hypot(entry.current.x - x, entry.current.z - z);
            if (d < bestDist) {
              bestDist = d;
              bestId = id;
            }
          }
          if (bestId) {
            const entry = remoteMap.get(bestId);
            const emoteName = bestDist <= 1.6 ? 'hug' : 'wave';
            state.startEmote(emoteName, EMOTE_DURATION);
            if (entry) {
              entry.emote = emoteName;
              entry.emoteUntil = Date.now() + EMOTE_DURATION;
            }
            publishPlayerAction(roomId, user, 'emote', {
              emote: emoteName,
              duration: EMOTE_DURATION,
              targetId: bestId,
            });
            if (emoteTimer.current) clearTimeout(emoteTimer.current);
            emoteTimer.current = setTimeout(() => {
              usePlayerStore.getState().endEmote();
            }, EMOTE_DURATION);
            break;
          }
          state.sitAuto();
          break;
        }
        case 'KeyF': {
          // اولویت: چیدن گیاه (F) → گرفتن حشره با تور (F) → چراغ ون
          const forageNear = !state.action ? findNearestForage(x, z, 2.0) : null;
          if (forageNear) {
            event.preventDefault();
            playPositionalOneShot(BERRY_PICK_SOUND, [x, 1.2, z], { volume: 0.8 });
            state.startAction('forage-pick');
            publishPlayerAction(roomId, user, 'action', { action: 'forage-pick', duration: 900 });
            if (forageTimer.current) clearTimeout(forageTimer.current);
            forageTimer.current = setTimeout(() => {
              const s = usePlayerStore.getState();
              if (s.action === 'forage-pick') s.endAction();
              publishPlayerAction(roomId, user, 'action-end');
              forageTimer.current = null;
            }, 900);
            // چیدن در همان لحظه (شعاع کمی بزرگ‌تر از برد پرامپت)
            const picked = tryPickForage(x, z, 2.0);
            if (picked) {
              usePlayerStore.getState().addForageItem(picked);
              kickPunch(0.16);
              kickShake(0.22);
              emitPickup(x, 1.1, z, picked.color || '#ffd98a');
            }
            usePlayerStore.getState().setNearForage(null);
            break;
          }
          // اگر حشره نزدیک است، F = گرفتن با تور؛ وگرنه چراغ ون
          const bugDist = nearestBugDistance(x, z);
          if (bugDist <= 2.4 && !state.action) {
            event.preventDefault();
            playPositionalOneShot(BUG_NET_SOUND, [x, 1.2, z], { volume: 0.8 });
            state.startAction('bug-catch');
            publishPlayerAction(roomId, user, 'action', { action: 'bug-catch', duration: 700 });
            if (bugTimer.current) clearTimeout(bugTimer.current);
            bugTimer.current = setTimeout(() => {
              const s = usePlayerStore.getState();
              if (s.action === 'bug-catch') s.endAction();
              publishPlayerAction(roomId, user, 'action-end');
              bugTimer.current = null;
            }, 700);
            // گرفتن در همان لحظه با شعاع تور
            const caught = tryCatchBug(x, z, 1.9);
            if (caught) {
              playPositionalOneShot(BUG_CATCH_SOUND, [x, 1.2, z], { volume: 0.9 });
              usePlayerStore.getState().addBug(caught);
              kickPunch(0.14);
              kickShake(0.18);
              emitPickup(x, 1.2, z, caught.color || '#b7ffd8');
              // کرم شب‌تاب در شب برای کوئست جادوگر شمرده می‌شود (Phase 4)
              if (caught.id === 'firefly' && isNight()) {
                usePlayerStore.getState().addNightFirefly();
              }
            }
            break;
          }
          state.setHeadlights(!state.headlights);
          break;
        }
        case 'KeyG': {
          // گیتار از هر جای نقشه (نه فقط کنار آتش)
          if (state.action === 'guitar') {
            state.endAction();
            publishPlayerAction(roomId, user, 'action-end');
            if (guitarTimer.current) clearTimeout(guitarTimer.current);
            guitarTimer.current = null;
            return;
          }
          const sound = GUITAR_SOUNDS[Math.floor(Math.random() * GUITAR_SOUNDS.length)];
          // اگر اکشن دیگری (مثلاً مارشمالو) در جریان است، تایمر آن لغو می‌شود
          cancelPendingAction(state);
          state.startAction('guitar');
          playPositionalOneShot(sound, [x, 1.2, z], { volume: 0.9 });
          publishPlayerAction(roomId, user, 'guitar', { sound, duration: GUITAR_DURATION });
          guitarTimer.current = setTimeout(() => {
            usePlayerStore.getState().endAction();
            publishPlayerAction(roomId, user, 'action-end');
          }, GUITAR_DURATION);
          break;
        }
        case 'KeyM': {
          if (!state.nearFire) return;
          if (state.action === 'marshmallow') {
            state.endAction();
            publishPlayerAction(roomId, user, 'action-end');
            if (marshmallowTimer.current) clearTimeout(marshmallowTimer.current);
            marshmallowTimer.current = null;
            return;
          }
          // اگر گیتار در جریان است، تایمرش لغو و مارشمالو شروع می‌شود
          cancelPendingAction(state);
          state.startAction('marshmallow');
          state.setMarshmallow('roasting');
          publishPlayerAction(roomId, user, 'action', {
            action: 'marshmallow',
            duration: MARSHMALLOW_DURATION + MARSHMALLOW_READY_HOLD,
          });
          if (marshmallowTimer.current) clearTimeout(marshmallowTimer.current);
          marshmallowTimer.current = setTimeout(() => {
            const s = usePlayerStore.getState();
            s.setMarshmallow('ready');
            playPositionalOneShot(YUM_SOUND, [x, 1.2, z], { volume: 0.85 });
            publishPlayerAction(roomId, user, 'marshmallow-ready');
            marshmallowTimer.current = setTimeout(() => {
              const s2 = usePlayerStore.getState();
              if (s2.action === 'marshmallow') {
                s2.endAction();
                publishPlayerAction(roomId, user, 'action-end');
              }
              marshmallowTimer.current = null;
            }, MARSHMALLOW_READY_HOLD);
          }, MARSHMALLOW_DURATION);
          break;
        }
        default:
          break;
      }

      const emoteName = EMOTES[event.code];
      if (emoteName) {
        const state2 = usePlayerStore.getState();
        // اکشن در جریان (گیتار/مارشمالو) با شروع ایموت لغو می‌شود
        cancelPendingAction(state2);
        state2.startEmote(emoteName, EMOTE_DURATION);
        publishPlayerAction(roomId, user, 'emote', { emote: emoteName, duration: EMOTE_DURATION });
        if (emoteTimer.current) clearTimeout(emoteTimer.current);
        emoteTimer.current = setTimeout(() => {
          usePlayerStore.getState().endEmote();
        }, EMOTE_DURATION);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      clearTimers();
    };
  }, [roomId, user]);

  useEffect(() => {
    resetPlayerPhysics(local.x, local.z);
    return () => {
      const state = usePlayerStore.getState();
      if (state.action) state.endAction();
      if (state.emote) state.endEmote();
    };
    // فقط در mount — local یک شیء ماژول‌سطح است
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, rawDelta) => {
    const group = groupRef.current;
    if (!group) return;

    const delta = Math.min(rawDelta, 0.05);
    const keys = getKeys();
    const state = usePlayerStore.getState();

    const camYaw = look?.yaw?.current ?? 0;
    const camPitch = look?.pitch?.current ?? 0;

    // ---- حالت نشسته ----
    if (state.seated && state.seatIndex !== null) {
      const spot = SEAT_SPOTS[state.seatIndex];
      const seatY = getWalkSurfaceY(spot.x, spot.z) + (spot.restY || 0);
      group.position.set(spot.x, seatY, spot.z);
      group.rotation.y = spot.rotation;
      resetPlayerPhysics(spot.x, spot.z);

      desiredCam.current.set(
        spot.x + Math.sin(camYaw) * CAM_DIST,
        seatY + CAM_HEIGHT + 0.8,
        spot.z + Math.cos(camYaw) * CAM_DIST
      );
      camera.position.lerp(desiredCam.current, CAM_LERP);
      lookTarget.set(spot.x, seatY + 1.0, spot.z);
      smoothLook.current.lerp(lookTarget, 0.15);
      camera.lookAt(smoothLook.current);
      applyJuice(camera, delta, performance.now() * 0.001);

      // فقط صندلی‌های دور آتش اجازه‌ی مارشمالو می‌دهند (نقاط استراحت نه)
      setNearFire(!spot.key || Math.hypot(spot.x, spot.z) < SEAT_RADIUS + 1.6);
      setLocalTransform(spot.x, spot.z, spot.rotation, false);
      velocity.current.multiplyScalar(0.5);
      movingRef.current = false;
      runningRef.current = false;
      setNearInteractable(null);
      usePlayerStore.getState().setNearForage(null);
      const seatedTarget = getQuestTarget(state.quests, state.collected);
      setQuestDistance(
        seatedTarget ? Math.round(Math.hypot(seatedTarget.x - spot.x, seatedTarget.z - spot.z)) : null
      );
      return;
    }

    // ---- ورودی (نسبت به جهت نگاه) ----
    // وقتی بازی غیرفعال است (منوی توقف) ورودی نادیده گرفته می‌شود
    const virtual = activeRef.current
      ? state.virtualInput
      : { forward: false, backward: false, left: false, right: false, run: false };
    const activeKeys = activeRef.current ? keys : {};
    const forward = (activeKeys.forward || virtual.forward ? 1 : 0) - (activeKeys.backward || virtual.backward ? 1 : 0);
    const strafe = (activeKeys.right || virtual.right ? 1 : 0) - (activeKeys.left || virtual.left ? 1 : 0);
    const running = activeKeys.run || virtual.run;
    const wantsJump = Boolean(activeKeys.jump || virtual.jump);
    const emoting = Boolean(state.emote);

    const sin = Math.sin(camYaw);
    const cos = Math.cos(camYaw);

    // دوربین پشت بازیکن است؛ جلو = دورشدن از دوربین
    // forward = (-sin, -cos) و right = (cos, -sin)
    const inputX = forward * -sin + strafe * cos;
    const inputZ = forward * -cos + strafe * -sin;
    const inputLength = Math.hypot(inputX, inputZ);
    const moving = inputLength > 0.01 && !emoting && state.action === null;

    const maxSpeed = running ? RUN_SPEED : WALK_SPEED;
    const targetVelocity = velocity.current;

    if (moving) {
      const normX = (inputX / inputLength) * maxSpeed;
      const normZ = (inputZ / inputLength) * maxSpeed;
      targetVelocity.x += (normX - targetVelocity.x) * Math.min(1, ACCEL * delta);
      targetVelocity.z += (normZ - targetVelocity.z) * Math.min(1, ACCEL * delta);
    } else {
      targetVelocity.x -= targetVelocity.x * Math.min(1, DAMPING * delta);
      targetVelocity.z -= targetVelocity.z * Math.min(1, DAMPING * delta);
    }

    // ---- شیب تند: سُر خوردن (فقط روی خشکی، نه در شنا) ----
    const slide = isInWater(local.x, local.z) ? 0 : slopeSlide(local.x, local.z, slideDir);
    if (slide > 0) {
      const slidePower = slide * 3.2 * delta;
      targetVelocity.x += slideDir.x * slidePower;
      targetVelocity.z += slideDir.z * slidePower;
    }

    // ---- حرکت + کالیژن ----
    let nextX = local.x + targetVelocity.x * delta;
    let nextZ = local.z + targetVelocity.z * delta;

    // مرزهای نقشه — ورود به آب مجاز است (شنا)، ولی از نقشه بیرون نمی‌رود
    if (nextX < BOUNDS.minX) nextX = BOUNDS.minX;
    if (nextX > BOUNDS.maxX) nextX = BOUNDS.maxX;
    if (nextZ < BOUNDS.minZ) nextZ = BOUNDS.minZ;
    if (nextZ > BOUNDS.maxZ) nextZ = BOUNDS.maxZ;

    // عدم ورود به گودال آتش
    const distFire = Math.hypot(nextX, nextZ);
    if (distFire < FIRE_KEEPOUT + BODY_RADIUS) {
      const ratio = (FIRE_KEEPOUT + BODY_RADIUS) / Math.max(distFire, 0.0001);
      nextX *= ratio;
      nextZ *= ratio;
      targetVelocity.multiplyScalar(0.3);
    }

    // کالیژن با درختان — گرید فضایی، فقط سلول‌های اطراف
    const trees = getNearbyTrees(nextX, nextZ, treeBuf);
    for (let i = 0; i < trees.length; i += 1) {
      const tree = trees[i];
      const dx = nextX - tree.x;
      const dz = nextZ - tree.z;
      const d = Math.hypot(dx, dz) || 0.0001;
      // شعاع برخورد = عرض تنه، نه ارتفاع درخت
      const minDist = (tree.collision ?? tree.scale * 0.5) + BODY_RADIUS;
      if (d < minDist) {
        nextX = tree.x + (dx / d) * minDist;
        nextZ = tree.z + (dz / d) * minDist;
      }
    }

    // کالیژن با ون
    const cosV = Math.cos(-VAN.rotation);
    const sinV = Math.sin(-VAN.rotation);
    const relX = nextX - VAN.x;
    const relZ = nextZ - VAN.z;
    const localX = relX * cosV - relZ * sinV;
    const localZ = relX * sinV + relZ * cosV;
    const halfX = 2.7 + BODY_RADIUS;
    const halfZ = 2.0 + BODY_RADIUS;
    if (Math.abs(localX) < halfX && Math.abs(localZ) < halfZ) {
      const pushX = halfX - Math.abs(localX);
      const pushZ = halfZ - Math.abs(localZ);
      let newLocalX = localX;
      let newLocalZ = localZ;
      if (pushX < pushZ) newLocalX = Math.sign(localX || 1) * halfX;
      else newLocalZ = Math.sign(localZ || 1) * halfZ;

      const cosB = Math.cos(VAN.rotation);
      const sinB = Math.sin(VAN.rotation);
      nextX = VAN.x + newLocalX * cosB - newLocalZ * sinB;
      nextZ = VAN.z + newLocalX * sinB + newLocalZ * cosB;
      targetVelocity.multiplyScalar(0.3);
    }

    // ---- چرخش نرم ----
    const speed = Math.hypot(targetVelocity.x, targetVelocity.z);
    // ---- فیزیک زمین: گرانش، پرش، شنا، قدم‌صدا ----
    const phys = stepPlayerPhysics(nextX, nextZ, delta, wantsJump);

    // ---- squash/stretch: کشیده شدن در پرش و فشرده شدن در فرود ----
    const physics = getPlayerPhysics();
    if (!phys.grounded && physics.vy > 0) {
      squashRef.current.s += (1.1 - squashRef.current.s) * Math.min(1, delta * 10);
    } else if (phys.landed) {
      squashRef.current.s = 0.74;
    } else {
      squashRef.current.s += (1 - squashRef.current.s) * Math.min(1, delta * 9);
    }
    // شنا سرعت را کم می‌کند
    if (phys.swimming && speed > 0.01) {
      targetVelocity.x *= phys.speedFactor;
      targetVelocity.z *= phys.speedFactor;
    }

    let targetRot = group.rotation.y;
    if (speed > 0.25) {
      targetRot = Math.atan2(targetVelocity.x, targetVelocity.z);
    }
    let rotDelta = targetRot - group.rotation.y;
    while (rotDelta > Math.PI) rotDelta -= Math.PI * 2;
    while (rotDelta < -Math.PI) rotDelta += Math.PI * 2;
    group.rotation.y += rotDelta * TURN_LERP;

    group.position.set(nextX, phys.y, nextZ);

    setLocalTransform(nextX, nextZ, group.rotation.y, speed > 0.15);
    movingRef.current = speed > 0.2;
    runningRef.current = running && speed > 0.2;

    // ---- گزارش دیباگ جهت (فقط وقتی روشن است، ۴ بار در ثانیه) ----
    debugTimer.current += delta;
    if (debugRef.current.enabled && debugTimer.current >= 0.25) {
      debugTimer.current = 0;
      const { character } = usePlayerStore.getState();
      const settings = useSettingsStore.getState();
      const offset = settings.facingOverrides[character] ?? 0;
      let finalRot = group.rotation.y;
      while (finalRot > Math.PI) finalRot -= Math.PI * 2;
      while (finalRot < -Math.PI) finalRot += Math.PI * 2;
      usePlayerStore.getState().setFacingDebug({
        model: character,
        yaw: group.rotation.y,
        offset,
        final: finalRot,
        dir: Math.atan2(targetVelocity.x, targetVelocity.z),
        speed,
      });
    }

    const nearFire = Math.hypot(nextX, nextZ) < SEAT_RADIUS + 1.6;
    setNearFire(nearFire);

    // ---- دوربین سوم‌شخص نزدیک (terrain-aware) ----
    // نمونه‌برداری در امتداد بوکه: دوربین هرگز داخل زمین/درخت نمی‌رود
    const camTargetY = phys.y + CAM_HEIGHT * 0.95;
    const camDirX = Math.sin(camYaw);
    const camDirZ = Math.cos(camYaw);
    let camDist = CAM_DIST;

    for (let i = 1; i <= CAM_SAMPLES; i += 1) {
      const t = i / CAM_SAMPLES;
      const sx = nextX + camDirX * CAM_DIST * t;
      const sz = nextZ + camDirZ * CAM_DIST * t;
      const sy = camTargetY * (1 - t) + (camTargetY + CAM_HEIGHT * 0.35) * t;
      const surface = getWalkSurfaceY(sx, sz) + 0.35;
      if (sy < surface) {
        // نزدیک‌تر از این نقطه دوربین به زمین می‌خورد
        camDist = Math.max(CAM_MIN_DIST, CAM_DIST * t - 0.25);
        break;
      }
    }

    // درختان نزدیک مسیر دوربین هم مانع‌اند
    const camTrees = getNearbyTrees(
      nextX + camDirX * camDist * 0.6,
      nextZ + camDirZ * camDist * 0.6,
      treeBuf
    );
    for (let i = 0; i < camTrees.length; i += 1) {
      const tree = camTrees[i];
      const dx = nextX + camDirX * camDist - tree.x;
      const dz = nextZ + camDirZ * camDist - tree.z;
      const trunkR = (tree.collision ?? tree.scale * 0.5) + 0.3;
      if (Math.hypot(dx, dz) < trunkR) {
        camDist = Math.max(CAM_MIN_DIST, camDist * 0.72);
        break;
      }
    }

    const camGroundY = getWalkSurfaceY(nextX, nextZ);
    const camY = Math.max(camGroundY + CAM_HEIGHT, phys.y + CAM_HEIGHT * 0.85);
    desiredCam.current.set(
      nextX + camDirX * camDist,
      camY,
      nextZ + camDirZ * camDist
    );
    camera.position.lerp(desiredCam.current, CAM_LERP);

    // FOV نرم هنگام دویدن (حس سرعت)
    applyFovKick(camera, runningRef.current, delta);

    // هدف نگاه: جلوی بازیکن، چرخیده با pitch (بدون اثر روی موقعیت دوربین)
    const cosP = Math.cos(camPitch);
    const sinP = Math.sin(camPitch);
    lookTarget.set(
      nextX - Math.sin(camYaw) * cosP * 8,
      phys.y + 1.35 + sinP * 8,
      nextZ - Math.cos(camYaw) * cosP * 8
    );
    smoothLook.current.lerp(lookTarget, 0.35);
    camera.lookAt(smoothLook.current);
    applyJuice(camera, delta, performance.now() * 0.001);

    // ---- Raycast تعامل ----
    raycastTimer.current += delta;
    if (raycastTimer.current > 0.1) {
      raycastTimer.current = 0;
      rayOrigin.set(nextX, phys.y + 1.1, nextZ);
      rayDirection.set(Math.sin(group.rotation.y), 0, Math.cos(group.rotation.y));
      raycaster.current.set(rayOrigin, rayDirection);
      raycaster.current.far = 5;
      const hits = raycaster.current.intersectObjects(getInteractables(), true);
      setHovered(hits.length > 0 ? resolveInteractableKey(hits[0].object) : null);

      // نزدیک‌ترین آیتم تعاملی مأموریت (فاصله‌ی اقلیدسی)
      const near = findNearbyQuestItem(nextX, nextZ);
      // اگر آیتم مأموریت نبود، NPC نزدیک (E → دیالوگ)
      const npcNear = !near ? findNearbyNpc(nextX, nextZ) : null;
      // اگر آیتم مأموریت نبود، ایستگاه پخت نزدیک (E → UI پخت)
      const cookNear = !near && !npcNear ? findNearbyCookingStation(nextX, nextZ) : null;
      // اگر هیچ‌کدام نبود، نقطه‌ی ماهیگیری نزدیک (E → مینی‌گیم ماهیگیری)
      const fishNear = !near && !npcNear && !cookNear ? findNearbyFishingSpot(nextX, nextZ) : null;
      // اگر آیتم مأموریت نبود، نقطه‌ی استراحت نزدیک (هاموک/کیسه‌خواب/کنده/میز)
      let restNear = null;
      if (!near && !npcNear && !cookNear && !fishNear) {
        const taken = new Set();
        for (const entry of remoteMap.values()) {
          if (entry.seat !== null && entry.seat !== undefined) taken.add(entry.seat);
        }
        restNear = findNearbyRestSpot(nextX, nextZ, taken);
      }
      setNearInteractable(
        near
          ? {
            key: near.key,
            label: near.label,
            locked: Boolean(near.isLocked?.()),
            action: near.action,
          }
          : npcNear
            ? {
              key: npcNear.id,
              label: npcNear.label,
              locked: false,
              action: npcNear.action,
            }
            : cookNear
              ? {
                key: cookNear.key,
                label: 'برای پختن',
                locked: false,
                action: cookNear.action,
              }
              : fishNear
                ? {
                  key: fishNear.key,
                  label: 'برای ماهیگیری',
                  locked: false,
                  action: fishNear.action,
                }
                : restNear
                  ? {
                    key: restNear.key,
                    label: restNear.label,
                    locked: false,
                    action: () => usePlayerStore.getState().setSeat(restNear.seatIndex, restNear.rest),
                  }
                  : null
      );

      // راهنمای مسیر: فاصله تا هدف مرحله‌ی فعال (گردشده تا re-render کمینه شود)
      const target = getQuestTarget(state.quests, state.collected);
      setQuestDistance(target ? Math.round(Math.hypot(target.x - nextX, target.z - nextZ)) : null);

      // نشانگر نزدیکی حشره برای HUD (فقط تغییر boolean رندر می‌شود)
      usePlayerStore.getState().setNearBug(nearestBugDistance(nextX, nextZ) <= 2.4);

      // نشانگر نزدیکی گیاه برای HUD (فقط تغییر index رندر می‌شود)
      const forageNear = findNearestForage(nextX, nextZ, 2.0);
      usePlayerStore.getState().setNearForage(
        forageNear ? { index: forageNear.index, item: forageNear.item } : null
      );
    }
  });

  return (
    <group ref={groupRef} position={[local.x, getWalkSurfaceY(local.x, local.z), local.z]}>
      {/* مدل کاراکتر ممکن است هنوز لود نشده باشد؛ مرز Suspense اختصاصی
          مانع می‌شود لود مدل، کل کنترلر/صحنه را unmount کند. */}
      <Suspense fallback={null}>
        <Character
          model={character}
          moving={movingRef}
          running={runningRef}
          emote={emote}
          action={action}
          marshmallowStage={() => usePlayerStore.getState().marshmallow}
          seated={seated}
          rest={rest}
          squashRef={squashRef}
          questProgress={() => totalQuestProgress(usePlayerStore.getState().quests)}
          wardrobe={wardrobe}
          castShadow
          crumbs
        />
      </Suspense>

      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.62, 26]} />
        <meshBasicMaterial color="#8ad6c1" transparent opacity={0.5} depthWrite={false} />
      </mesh>
      <ChatBubble id={user?.id != null ? String(user.id) : 'local'} />
    </group>
  );
}
