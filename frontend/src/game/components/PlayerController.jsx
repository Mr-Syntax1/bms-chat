import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { FIRE_KEEPOUT, SEAT_RADIUS, SEAT_SPOTS, VAN, BOUNDS, DOCK } from '../sceneLayout';
import { usePlayerStore } from '../stores/usePlayerStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getNearbyTrees } from '../activeTrees';
import { getInteractables, resolveInteractableKey } from '../interactionRegistry';
import { findNearbyQuestItem } from '../questRegistry';
import { getQuestTarget } from '../questSteps';
import { playPositionalOneShot } from '../audio';
import { publishPlayerAction } from '../hooks/useGameSync';
import Character from './Character';
import { GUITAR_SOUNDS, YUM_SOUND } from '../sounds';

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

// دوربین سوم‌شخص نزدیک
const CAM_DIST = 2.5;
const CAM_HEIGHT = 1.5;
const CAM_LERP = 0.1;

const EMOTES = {
  Digit1: 'wave',
  Digit2: 'dance',
  Digit3: 'laugh',
  Digit4: 'celebrate',
  Digit5: 'sleep',
};

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
  // بافر ثابت برای کوئری گرید درختان (بدون تخصیص در هر فریم)
  const treeBuf = useMemo(() => [], []);

  const guitarTimer = useRef(null);
  const marshmallowTimer = useRef(null);
  const emoteTimer = useRef(null);

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
  const emote = usePlayerStore((s) => s.emote);
  const action = usePlayerStore((s) => s.action);
  const character = usePlayerStore((s) => s.character);
  const local = usePlayerStore((s) => s.local);

  // کلیدهای تعاملی: E تعامل، F چراغ ون، G گیتار، M مارشمالو، 1..5 ایموت
  useEffect(() => {
    const clearTimers = () => {
      if (guitarTimer.current) clearTimeout(guitarTimer.current);
      if (marshmallowTimer.current) clearTimeout(marshmallowTimer.current);
      if (emoteTimer.current) clearTimeout(emoteTimer.current);
      guitarTimer.current = null;
      marshmallowTimer.current = null;
      emoteTimer.current = null;
    };

    // تایمرهای اکشن قبلی را می‌بندد تا با شروع اکشن جدید،
    // رویداد کهنه (مثل yum بعد از گیتار) برای بازیکنان دیگر ارسال نشود
    const cancelPendingAction = (state) => {
      const hadAction = Boolean(state.action);
      if (guitarTimer.current) clearTimeout(guitarTimer.current);
      if (marshmallowTimer.current) clearTimeout(marshmallowTimer.current);
      guitarTimer.current = null;
      marshmallowTimer.current = null;
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
      const { x, z } = state.local;

      switch (event.code) {
        case 'KeyE': {
          event.preventDefault();
          // آیتم قفل‌شده (ترتیب مأموریت) اجرا نمی‌شود
          if (state.nearInteractable?.locked) {
            state.pushToast('این مرحله هنوز قفل است!', 'warn');
            break;
          }
          // اگر آیتم تعاملی نزدیک است، تعامل کن؛ وگرنه نشستن روی کنده
          if (state.nearInteractable?.action) {
            state.nearInteractable.action();
          } else {
            state.sitAuto();
          }
          break;
        }
        case 'KeyF':
          state.setHeadlights(!state.headlights);
          break;
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
    return () => {
      const state = usePlayerStore.getState();
      if (state.action) state.endAction();
      if (state.emote) state.endEmote();
    };
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
      group.position.set(spot.x, 0, spot.z);
      group.rotation.y = spot.rotation;

      desiredCam.current.set(
        spot.x + Math.sin(camYaw) * CAM_DIST,
        CAM_HEIGHT + 0.8,
        spot.z + Math.cos(camYaw) * CAM_DIST
      );
      camera.position.lerp(desiredCam.current, CAM_LERP);
      lookTarget.set(spot.x, 1.0, spot.z);
      smoothLook.current.lerp(lookTarget, 0.15);
      camera.lookAt(smoothLook.current);

      setNearFire(true);
      setLocalTransform(spot.x, spot.z, spot.rotation, false);
      velocity.current.multiplyScalar(0.5);
      movingRef.current = false;
      runningRef.current = false;
      setNearInteractable(null);
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

    // ---- حرکت + کالیژن ----
    let nextX = local.x + targetVelocity.x * delta;
    let nextZ = local.z + targetVelocity.z * delta;

    // مرزهای نقشه (نمی‌تواند وارد آب شود) — فقط روی تخته‌های اسکله استثناست
    const onDock = nextX > BOUNDS.maxX && Math.abs(nextZ - DOCK.z) < DOCK.width * 0.55;
    const maxX = onDock ? DOCK.x + DOCK.length - 4 : BOUNDS.maxX;
    if (nextX < BOUNDS.minX) nextX = BOUNDS.minX;
    if (nextX > maxX) nextX = maxX;
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
      const minDist = tree.scale * 0.5 + BODY_RADIUS;
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
    let targetRot = group.rotation.y;
    if (speed > 0.25) {
      targetRot = Math.atan2(targetVelocity.x, targetVelocity.z);
    }
    let rotDelta = targetRot - group.rotation.y;
    while (rotDelta > Math.PI) rotDelta -= Math.PI * 2;
    while (rotDelta < -Math.PI) rotDelta += Math.PI * 2;
    group.rotation.y += rotDelta * TURN_LERP;

    group.position.set(nextX, 0, nextZ);

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

    // ---- دوربین سوم‌شخص نزدیک ----
    // ۲.۵ واحد پشت سر و ۱.۵ واحد بالاتر؛ pitch جهت نگاه را بالا/پایین می‌برد
    desiredCam.current.set(
      nextX + Math.sin(camYaw) * CAM_DIST,
      CAM_HEIGHT,
      nextZ + Math.cos(camYaw) * CAM_DIST
    );
    camera.position.lerp(desiredCam.current, CAM_LERP);

    // هدف نگاه: جلوی بازیکن، چرخیده با pitch (بدون اثر روی موقعیت دوربین)
    const cosP = Math.cos(camPitch);
    const sinP = Math.sin(camPitch);
    lookTarget.set(
      nextX - Math.sin(camYaw) * cosP * 8,
      1.35 + sinP * 8,
      nextZ - Math.cos(camYaw) * cosP * 8
    );
    smoothLook.current.lerp(lookTarget, 0.35);
    camera.lookAt(smoothLook.current);

    // ---- Raycast تعامل ----
    raycastTimer.current += delta;
    if (raycastTimer.current > 0.1) {
      raycastTimer.current = 0;
      rayOrigin.set(nextX, 1.1, nextZ);
      rayDirection.set(Math.sin(group.rotation.y), 0, Math.cos(group.rotation.y));
      raycaster.current.set(rayOrigin, rayDirection);
      raycaster.current.far = 5;
      const hits = raycaster.current.intersectObjects(getInteractables(), true);
      setHovered(hits.length > 0 ? resolveInteractableKey(hits[0].object) : null);

      // نزدیک‌ترین آیتم تعاملی مأموریت (فاصله‌ی اقلیدسی)
      const near = findNearbyQuestItem(nextX, nextZ);
      setNearInteractable(
        near
          ? {
            key: near.key,
            label: near.label,
            locked: Boolean(near.isLocked?.()),
            action: near.action,
          }
          : null
      );

      // راهنمای مسیر: فاصله تا هدف مرحله‌ی فعال (گردشده تا re-render کمینه شود)
      const target = getQuestTarget(state.quests, state.collected);
      setQuestDistance(target ? Math.round(Math.hypot(target.x - nextX, target.z - nextZ)) : null);
    }
  });

  return (
    <group ref={groupRef} position={[local.x, 0, local.z]}>
      <Character
        model={character}
        moving={movingRef}
        running={runningRef}
        emote={emote}
        action={action}
        marshmallowStage={() => usePlayerStore.getState().marshmallow}
        seated={seated}
        castShadow
      />

      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.62, 26]} />
        <meshBasicMaterial color="#8ad6c1" transparent opacity={0.5} depthWrite={false} />
      </mesh>
    </group>
  );
}
