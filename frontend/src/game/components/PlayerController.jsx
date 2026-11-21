import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { FIRE_KEEPOUT, SEAT_RADIUS, SEAT_SPOTS, VAN, WALK_RADIUS } from '../sceneLayout';
import { usePlayerStore } from '../stores/usePlayerStore';
import { getInteractables, resolveInteractableKey } from '../interactionRegistry';
import { playPositionalOneShot } from '../audio';
import { publishPlayerAction } from '../hooks/useGameSync';
import Character from './Character';
import { GUITAR_SOUND, YUM_SOUND } from '../sounds';

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

const EMOTES = {
  Digit1: 'wave',
  Digit2: 'dance',
  Digit3: 'laugh',
  Digit4: 'celebrate',
  Digit5: 'sleep',
};

// کنترلر بازیکن محلی: WASD + دویدن، کالیژن، دوربین سوم‌شخص، اکشن‌ها و ایموت‌ها
export default function PlayerController({ roomId, user }) {
  const { camera, gl } = useThree();
  const groupRef = useRef(null);
  const [, getKeys] = useKeyboardControls();

  const velocity = useRef(new THREE.Vector3());
  const raycaster = useRef(new THREE.Raycaster());
  const rayOrigin = useMemo(() => new THREE.Vector3(), []);
  const rayDirection = useMemo(() => new THREE.Vector3(), []);
  const pointer = useRef({ x: 0 });
  const smoothLook = useRef(new THREE.Vector3(0, 1.5, 10.5));
  const lookTarget = useMemo(() => new THREE.Vector3(), []);
  const desiredCam = useRef(new THREE.Vector3());
  const raycastTimer = useRef(0);
  const movingRef = useRef(false);
  const runningRef = useRef(false);

  // تایمرهای اکشن
  const guitarTimer = useRef(null);
  const marshmallowTimer = useRef(null);
  const emoteTimer = useRef(null);

  const setLocalTransform = usePlayerStore((s) => s.setLocalTransform);
  const setNearFire = usePlayerStore((s) => s.setNearFire);
  const setHovered = usePlayerStore((s) => s.setHovered);
  const seated = usePlayerStore((s) => s.seated);
  const emote = usePlayerStore((s) => s.emote);
  const action = usePlayerStore((s) => s.action);
  const local = usePlayerStore((s) => s.local);

  // چرخش دوربین با درگ موس
  useEffect(() => {
    const el = gl.domElement;
    const onPointerMove = (event) => {
      if (event.buttons !== 1) return;
      pointer.current.x -= event.movementX * 0.0022;
    };
    el.addEventListener('pointermove', onPointerMove);
    return () => el.removeEventListener('pointermove', onPointerMove);
  }, [gl]);

  // کلیدهای تعاملی: E نشستن، F چراغ ون، G گیتار، M مارشمالو، 1..5 ایموت
  useEffect(() => {
    const clearTimers = () => {
      if (guitarTimer.current) clearTimeout(guitarTimer.current);
      if (marshmallowTimer.current) clearTimeout(marshmallowTimer.current);
      if (emoteTimer.current) clearTimeout(emoteTimer.current);
      guitarTimer.current = null;
      marshmallowTimer.current = null;
      emoteTimer.current = null;
    };

    const onKeyDown = (event) => {
      if (event.repeat) return;
      const state = usePlayerStore.getState();
      // موقعیت لحظه‌ای برای صدای مکانی (از state زنده خوانده می‌شود)
      const { x, z } = state.local;

      switch (event.code) {
        case 'KeyE':
          event.preventDefault();
          state.sitAuto();
          break;
        case 'KeyF':
          state.setHeadlights(!state.headlights);
          break;
        case 'KeyG': {
          if (!state.nearFire) return;
          // اگر گیتار در حال پخش است، متوقف کن
          if (state.action === 'guitar') {
            state.endAction();
            publishPlayerAction(roomId, user, 'action-end');
            if (guitarTimer.current) clearTimeout(guitarTimer.current);
            guitarTimer.current = null;
            return;
          }
          state.startAction('guitar');
          playPositionalOneShot(GUITAR_SOUND, [x, 1.2, z], { volume: 0.9 });
          publishPlayerAction(roomId, user, 'action', { action: 'guitar', duration: GUITAR_DURATION });
          if (guitarTimer.current) clearTimeout(guitarTimer.current);
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
          state.startAction('marshmallow');
          state.setMarshmallow('roasting');
          publishPlayerAction(roomId, user, 'action', {
            action: 'marshmallow',
            duration: MARSHMALLOW_DURATION + MARSHMALLOW_READY_HOLD,
          });
          if (marshmallowTimer.current) clearTimeout(marshmallowTimer.current);
          // بعد از ۳ ثانیه قهوه‌ای می‌شود و صدای yum پخش می‌شود
          marshmallowTimer.current = setTimeout(() => {
            const s = usePlayerStore.getState();
            s.setMarshmallow('ready');
            playPositionalOneShot(YUM_SOUND, [x, 1.2, z], { volume: 0.85 });
            publishPlayerAction(roomId, user, 'marshmallow-ready');
            // چند لحظه بعد سیخ برداشته می‌شود تا حرکت قفل نماند
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

      // ایموت‌ها
      const emoteName = EMOTES[event.code];
      if (emoteName) {
        const state2 = usePlayerStore.getState();
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

  // هنگام خروج از بازی، اکشن/ایموت باز را ببند
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

    const camDist = 10.5;
    const camHeight = 5.2;

    // ---- حالت نشسته ----
    if (state.seated && state.seatIndex !== null) {
      const spot = SEAT_SPOTS[state.seatIndex];
      group.position.set(spot.x, 0, spot.z);
      group.rotation.y = spot.rotation;
      desiredCam.current.set(spot.x * 0.35, 3.4, spot.z * 0.35);
      camera.position.lerp(desiredCam.current, 0.06);
      camera.lookAt(0, 1.1, 0);
      setNearFire(true);
      setLocalTransform(spot.x, spot.z, spot.rotation, false);
      velocity.current.multiplyScalar(0.5);
      movingRef.current = false;
      runningRef.current = false;
      return;
    }

    // ---- ورودی ----
    const virtual = state.virtualInput;
    const forward = (keys.forward || virtual.forward ? 1 : 0) - (keys.backward || virtual.backward ? 1 : 0);
    const strafe = (keys.right || virtual.right ? 1 : 0) - (keys.left || virtual.left ? 1 : 0);
    const running = keys.run || virtual.run;
    const emoting = Boolean(state.emote);

    const camAngle = pointer.current.x;
    const sin = Math.sin(camAngle);
    const cos = Math.cos(camAngle);

    const inputX = strafe * cos + forward * sin;
    const inputZ = strafe * sin - forward * cos;
    const inputLength = Math.hypot(inputX, inputZ);
    // در حال ایموت یا اکشن، حرکت قفل می‌شود
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

    // مرز بیرونی جنگل
    const distFromCenter = Math.hypot(nextX, nextZ);
    const maxRadius = WALK_RADIUS - BODY_RADIUS;
    if (distFromCenter > maxRadius) {
      const ratio = maxRadius / distFromCenter;
      nextX *= ratio;
      nextZ *= ratio;
      targetVelocity.multiplyScalar(0.2);
    }

    // عدم ورود به گودال آتش
    const distFire = Math.hypot(nextX, nextZ);
    if (distFire < FIRE_KEEPOUT + BODY_RADIUS) {
      const ratio = (FIRE_KEEPOUT + BODY_RADIUS) / Math.max(distFire, 0.0001);
      nextX *= ratio;
      nextZ *= ratio;
      targetVelocity.multiplyScalar(0.3);
    }

    // کالیژن با درختان (شعاع تنه ≈ ۰.۳۵ × مقیاس درخت)
    const tree = state.nearestTree(nextX, nextZ, 3.2);
    if (tree) {
      const dx = nextX - tree.x;
      const dz = nextZ - tree.z;
      const d = Math.hypot(dx, dz) || 1;
      const minDist = tree.scale * 0.36 + BODY_RADIUS;
      if (d < minDist) {
        nextX = tree.x + (dx / d) * minDist;
        nextZ = tree.z + (dz / d) * minDist;
      }
    }

    // کالیژن با ون در فضای محلی ون (چون ون چرخیده است)
    const cosV = Math.cos(-VAN.rotation);
    const sinV = Math.sin(-VAN.rotation);
    const relX = nextX - VAN.x;
    const relZ = nextZ - VAN.z;
    const localX = relX * cosV - relZ * sinV;
    const localZ = relX * sinV + relZ * cosV;
    const halfX = 2.7 + BODY_RADIUS;
    const halfZ = 2.0 + BODY_RADIUS;
    if (Math.abs(localX) < halfX && Math.abs(localZ) < halfZ) {
      // بازیکن را به نزدیک‌ترین لبه‌ی جعبه‌ی ون هل بده
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

    // ---- Store ----
    setLocalTransform(nextX, nextZ, group.rotation.y, speed > 0.15);
    movingRef.current = speed > 0.2;
    runningRef.current = running && speed > 0.2;

    const nearFire = Math.hypot(nextX, nextZ) < SEAT_RADIUS + 1.6;
    setNearFire(nearFire);

    // ---- دوربین سوم‌شخص ----
    desiredCam.current.set(
      nextX + Math.sin(camAngle) * camDist,
      camHeight,
      nextZ + Math.cos(camAngle) * camDist
    );
    camera.position.lerp(desiredCam.current, 1 - Math.pow(0.0016, delta));
    lookTarget.set(nextX, 1.5, nextZ);
    smoothLook.current.lerp(lookTarget, 1 - Math.pow(0.0009, delta));
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
    }
  });

  return (
    <group ref={groupRef} position={[local.x, 0, local.z]}>
      <Character
        moving={movingRef}
        running={runningRef}
        emote={emote}
        action={action}
        seated={seated}
        castShadow
      />

      {/* حلقه‌ی نشانگر بازیکن محلی */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.62, 26]} />
        <meshBasicMaterial color="#8ad6c1" transparent opacity={0.5} depthWrite={false} />
      </mesh>
    </group>
  );
}
