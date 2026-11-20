import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { CAMP_RADIUS, FIRE_KEEPOUT, SEAT_RADIUS, SEAT_SPOTS, SEAT_HEIGHT, VAN } from '../sceneLayout';
import { usePlayerStore } from '../stores/usePlayerStore';
import { getInteractables, resolveInteractableKey } from '../interactionRegistry';

const WALK_SPEED = 3.4;
const RUN_SPEED = 6.2;
const ACCEL = 13;
const DAMPING = 11;
const TURN_LERP = 0.18;
const BODY_RADIUS = 0.38;

// کنترلر بازیکن محلی: WASD + دویدن، کالیژن دایره‌ای، دوربین سوم‌شخص
export default function PlayerController() {
  const { camera, gl } = useThree();
  const groupRef = useRef(null);
  const bodyRef = useRef(null);
  const [, getKeys] = useKeyboardControls();

  const velocity = useRef(new THREE.Vector3());
  const raycaster = useRef(new THREE.Raycaster());
  const rayOrigin = useMemo(() => new THREE.Vector3(), []);
  const rayDirection = useMemo(() => new THREE.Vector3(), []);
  const pointer = useRef({ x: 0 });
  const smoothLook = useRef(new THREE.Vector3(0, 1.5, 8.5));
  const lookTarget = useMemo(() => new THREE.Vector3(), []);
  const desiredCam = useRef(new THREE.Vector3());

  const setLocalTransform = usePlayerStore((s) => s.setLocalTransform);
  const setNearFire = usePlayerStore((s) => s.setNearFire);
  const setHovered = usePlayerStore((s) => s.setHovered);
  const local = usePlayerStore((s) => s.local);

  // موس برای چرخش دوربین (کلیک-درگ)
  useEffect(() => {
    const el = gl.domElement;
    const onPointerMove = (event) => {
      if (event.buttons !== 1) return;
      pointer.current.x -= event.movementX * 0.0022;
    };
    el.addEventListener('pointermove', onPointerMove);
    return () => el.removeEventListener('pointermove', onPointerMove);
  }, [gl]);

  // تعامل با آتش/ون: E نشستن/بلند شدن، F چراغ ون
  useEffect(() => {
    const onKeyDown = (event) => {
      const state = usePlayerStore.getState();
      if (event.code === 'KeyE') {
        event.preventDefault();
        state.sitAuto();
      }
      if (event.code === 'KeyF') state.setHeadlights(!state.headlights);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Raycasting سبک برای تشخیص شیء مقابل و نمایش راهنمای تعامل
  const raycastTimer = useRef(0);

  useFrame((_, rawDelta) => {
    const group = groupRef.current;
    if (!group) return;

    const delta = Math.min(rawDelta, 0.05);
    const keys = getKeys();
    const state = usePlayerStore.getState();

    // ---- چرخش دوربین با درگ ----
    const camDist = 8.5;
    const camHeight = 4.6;

    if (state.seated && state.seatIndex !== null) {
      // در حالت نشسته، دوربین قفل روی صندلی است
      const spot = SEAT_SPOTS[state.seatIndex];
      group.position.set(spot.x, 0, spot.z);
      group.rotation.y = spot.rotation;
      desiredCam.current.set(spot.x * 0.4, 2.9, spot.z * 0.4);
      camera.position.lerp(desiredCam.current, 0.06);
      camera.lookAt(0, 1.0, 0);
      setNearFire(true);
      // بدن روی کنده می‌نشیند
      if (bodyRef.current) bodyRef.current.position.y = SEAT_HEIGHT;
      setLocalTransform(spot.x, spot.z, spot.rotation, false);
      velocity.current.multiplyScalar(0.5);
      return;
    }

    if (bodyRef.current) bodyRef.current.position.y = 0;

    // ---- ورودی محور ----
    const virtual = state.virtualInput;
    const forward = (keys.forward || virtual.forward ? 1 : 0) - (keys.backward || virtual.backward ? 1 : 0);
    const strafe = (keys.right || virtual.right ? 1 : 0) - (keys.left || virtual.left ? 1 : 0);
    const running = keys.run || virtual.run;

    // جهت دوربین روی صفحه XZ
    const camAngle = pointer.current.x;
    const sin = Math.sin(camAngle);
    const cos = Math.cos(camAngle);

    const inputX = strafe * cos + forward * sin;
    const inputZ = strafe * sin - forward * cos;
    const inputLength = Math.hypot(inputX, inputZ);
    const moving = inputLength > 0.01;

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

    // مرز دایره‌ای کمپ
    const distFromCenter = Math.hypot(nextX, nextZ);
    const maxRadius = CAMP_RADIUS - BODY_RADIUS;
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

    // کالیژن با درختان نزدیک
    const tree = state.nearestTree(nextX, nextZ, 3);
    if (tree) {
      const dx = nextX - tree.x;
      const dz = nextZ - tree.z;
      const d = Math.hypot(dx, dz) || 1;
      const minDist = tree.scale * 0.5 + BODY_RADIUS;
      if (d < minDist) {
        nextX = tree.x + (dx / d) * minDist;
        nextZ = tree.z + (dz / d) * minDist;
      }
    }

    // کالیژن با ون (جعبه‌ی ساده)
    if (Math.abs(nextX - VAN.x) < 3.4 && Math.abs(nextZ - VAN.z) < 2.4) {
      nextX = local.x;
      nextZ = local.z;
      targetVelocity.multiplyScalar(0.3);
    }

    // ---- اعمال چرخش نرم به سمت جهت حرکت ----
    const speed = Math.hypot(targetVelocity.x, targetVelocity.z);
    let targetRot = group.rotation.y;
    if (speed > 0.25) {
      targetRot = Math.atan2(targetVelocity.x, targetVelocity.z);
    }
    let rotDelta = targetRot - group.rotation.y;
    while (rotDelta > Math.PI) rotDelta -= Math.PI * 2;
    while (rotDelta < -Math.PI) rotDelta += Math.PI * 2;
    group.rotation.y += rotDelta * TURN_LERP;

    // ---- انیمیشن راه رفتن سبک (bob) ----
    if (bodyRef.current) {
      const bob = speed > 0.2 ? Math.sin(performance.now() * 0.012) * 0.05 : 0;
      bodyRef.current.position.y = bob;
      bodyRef.current.rotation.z = speed > 0.2 ? Math.sin(performance.now() * 0.006) * 0.05 : 0;
    }

    group.position.set(nextX, 0, nextZ);

    // ---- به‌روزرسانی Store ----
    setLocalTransform(nextX, nextZ, group.rotation.y, speed > 0.15);

    // شعاع تعامل با آتش باید شامل کنده‌های نشستن (SEAT_RADIUS) هم بشود
    const nearFire = Math.hypot(nextX, nextZ) < SEAT_RADIUS + 1.1;
    setNearFire(nearFire);

    // ---- دوربین سوم‌شخص نرم ----
    desiredCam.current.set(
      nextX + Math.sin(camAngle) * camDist,
      camHeight,
      nextZ + Math.cos(camAngle) * camDist
    );
    camera.position.lerp(desiredCam.current, 1 - Math.pow(0.0016, delta));
    lookTarget.set(nextX, 1.35, nextZ);
    smoothLook.current.lerp(lookTarget, 1 - Math.pow(0.0009, delta));
    camera.lookAt(smoothLook.current);

    // ---- Raycast سبک از سمت بازیکن (هر ۱۰۰ میلی‌ثانیه) ----
    raycastTimer.current += delta;
    if (raycastTimer.current > 0.1) {
      raycastTimer.current = 0;
      const origin = rayOrigin.set(nextX, 1.1, nextZ);
      // جهت نگاه بازیکن: محور +Z مدل بعد از چرخش
      const dir = rayDirection.set(Math.sin(group.rotation.y), 0, Math.cos(group.rotation.y));
      raycaster.current.set(origin, dir);
      raycaster.current.far = 4.5;
      const hits = raycaster.current.intersectObjects(getInteractables(), true);
      setHovered(hits.length > 0 ? resolveInteractableKey(hits[0].object) : null);
    }
  });

  return (
    <group ref={groupRef} position={[local.x, 0, local.z]}>
      <group ref={bodyRef}>
        {/* کپسول بدنه */}
        <mesh position={[0, 0.85, 0]} castShadow>
          <capsuleGeometry args={[0.32, 0.86, 4, 10]} />
          <meshStandardMaterial color="#f0b27a" roughness={0.75} />
        </mesh>
        {/* سر */}
        <mesh position={[0, 1.72, 0]} castShadow>
          <sphereGeometry args={[0.26, 14, 12]} />
          <meshStandardMaterial color="#ffd9b3" roughness={0.8} />
        </mesh>
        {/* شال/روپوش */}
        <mesh position={[0, 0.92, 0]} castShadow>
          <cylinderGeometry args={[0.36, 0.42, 0.68, 10]} />
          <meshStandardMaterial color="#7a5c9e" roughness={0.9} flatShading />
        </mesh>
        {/* چشم‌ها (جهت رو به +Z) */}
        <mesh position={[0.1, 1.76, 0.22]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshStandardMaterial color="#20202a" />
        </mesh>
        <mesh position={[-0.1, 1.76, 0.22]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshStandardMaterial color="#20202a" />
        </mesh>
      </group>

      {/* حلقه‌ی نشانگر بازیکن محلی */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.46, 0.56, 24]} />
        <meshBasicMaterial color="#8ad6c1" transparent opacity={0.55} />
      </mesh>
    </group>
  );
}
