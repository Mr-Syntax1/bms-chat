// ---------------------------------------------------------------------------
// DecorationsScene.jsx — رندر دکوراسیون کمپ + پیش‌نمایش شبح (Phase 3f)
//
//  • موقعیت آیتم‌ها فقط از store خوانده می‌شود (state گسسته)؛ داده‌ی هر فریم
//    (حرکت موس / اعتبار مکان) در decorWorld بیرون React است.
//  • هر آیتم با نرمال‌سازی bbox (Fitted-style) روی زمین می‌نشیند.
//  • کنترلر: پرتاب پرتو روی زمین ناهموار با raycastTerrain (بدون raycast مش).
// ---------------------------------------------------------------------------
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { modelUrl } from '../assetManifest';
import { usePlayerStore } from '../stores/usePlayerStore';
import { playPositionalOneShot } from '../audio';
import { PLACE_ITEM_SOUND, TENT_ZIP_SOUND } from '../sounds';
import { getGroundHeight } from '../terrain';
import {
  DECOR_BY_ID,
  DECOR_BOUNDS_RADIUS,
  DECOR_COOLDOWN,
  DECOR_LIMIT,
  canPlaceDecor,
  countOwnedDecor,
  decorWorld,
  findOwnedDecorAt,
  newDecorUid,
  raycastTerrain,
  resetGhost,
} from '../decorData';
import { placeDecor, moveDecor, removeDecor, getDecorOwnerId } from '../decorSync';

// ---------------------------------------------------------------------------
// نرمال‌سازی مدل — bbox هر URL یک‌بار حساب و کش می‌شود
// ---------------------------------------------------------------------------
const bboxCache = new Map();

function measureScene(url, scene) {
  const cached = bboxCache.get(url);
  if (cached) return cached;
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const data = {
    sizeY: size.y || 1,
    minY: box.min.y,
    centerX: center.x,
    centerZ: center.z,
  };
  bboxCache.set(url, data);
  return data;
}

// ---------------------------------------------------------------------------
// یک آیتم دکور ثابت
// ---------------------------------------------------------------------------
function DecorModel({ entry, url }) {
  const meta = DECOR_BY_ID[entry.id];
  const { scene } = useGLTF(url);
  const info = useMemo(() => measureScene(url, scene), [url, scene]);

  const clone = useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = false;
      child.receiveShadow = false;
    });
    return copy;
  }, [scene]);

  const s = (meta.height / info.sizeY) * (entry.scale || 1);
  const groundY = getGroundHeight(entry.x, entry.z);

  return (
    <group position={[entry.x, groundY - info.minY * s, entry.z]} rotation={[0, entry.rotation || 0, 0]}>
      <group position={[-info.centerX * s, 0, -info.centerZ * s]} scale={s}>
        <primitive object={clone} />
      </group>
      {meta.light && (
        <pointLight position={[0, meta.height * 0.85, 0]} color="#ffc46b" intensity={2.4} distance={7} decay={2} />
      )}
    </group>
  );
}

function DecorItem({ entry }) {
  const meta = DECOR_BY_ID[entry.id];
  const url = meta ? modelUrl(meta.modelKey) : null;
  if (!url) return null;
  return (
    <Suspense fallback={null}>
      <DecorModel entry={entry} url={url} />
    </Suspense>
  );
}

// ---------------------------------------------------------------------------
// شبح نیمه‌شفاف — رنگ سبز/قرمز بر اساس اعتبار مکان
// ---------------------------------------------------------------------------
function GhostModel({ decorId, url }) {
  const meta = DECOR_BY_ID[decorId];
  const { scene } = useGLTF(url);
  const info = useMemo(() => measureScene(url, scene), [url, scene]);

  // دو متریال مشترک: معتبر/نامعتبر — در هر فریم فقط جابه‌جا می‌شوند
  const mats = useMemo(
    () => ({
      valid: new THREE.MeshBasicMaterial({ color: '#65f5a0', transparent: true, opacity: 0.45, depthWrite: false }),
      invalid: new THREE.MeshBasicMaterial({ color: '#ef4444', transparent: true, opacity: 0.32, depthWrite: false }),
    }),
    []
  );

  const clone = useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = false;
      child.receiveShadow = false;
      child.material = mats.valid;
    });
    return copy;
  }, [scene, mats]);

  const groupRef = useRef(null);
  const ringRef = useRef(null);
  const wasValid = useRef(true);

  useEffect(
    () => () => {
      mats.valid.dispose();
      mats.invalid.dispose();
    },
    [mats]
  );

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const { ghost } = decorWorld;
    group.visible = ghost.visible;
    if (!ghost.visible) return;
    const s = (meta.height / info.sizeY) * decorWorld.scale;
    group.position.set(ghost.x, ghost.y - info.minY * s, ghost.z);
    group.rotation.y = decorWorld.rotation;
    group.scale.setScalar(s);

    // تعویض متریال فقط هنگام تغییر اعتبار (بدون traverse هر فریم)
    if (ghost.valid !== wasValid.current) {
      wasValid.current = ghost.valid;
      const next = ghost.valid ? mats.valid : mats.invalid;
      clone.traverse((child) => {
        if (child.isMesh) child.material = next;
      });
    }

    if (ringRef.current) {
      ringRef.current.position.set(ghost.x, ghost.y + 0.03, ghost.z);
      ringRef.current.material.color.set(ghost.valid ? '#65f5a0' : '#ef4444');
      ringRef.current.scale.setScalar(meta.radius * 1.6 * decorWorld.scale);
      ringRef.current.visible = true;
    }
  });

  return (
    <group>
      <group ref={groupRef} visible={false}>
        <group position={[-info.centerX, 0, -info.centerZ]}>
          <primitive object={clone} />
        </group>
      </group>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.82, 1, 28]} />
        <meshBasicMaterial color="#65f5a0" transparent opacity={0.5} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function GhostPreview({ decorId }) {
  const meta = DECOR_BY_ID[decorId];
  const url = meta ? modelUrl(meta.modelKey) : null;
  if (!url) return null;
  return (
    <Suspense fallback={null}>
      <GhostModel decorId={decorId} url={url} />
    </Suspense>
  );
}

// حلقه‌ی محدوده‌ی مجاز کمپ (فقط در حالت دکور)
function BoundsRing() {
  const ref = useRef(null);
  useFrame(() => {
    if (!ref.current) return;
    ref.current.visible = usePlayerStore.getState().decorMode;
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} visible={false}>
      <ringGeometry args={[DECOR_BOUNDS_RADIUS - 0.22, DECOR_BOUNDS_RADIUS, 96]} />
      <meshBasicMaterial color="#ffc66d" transparent opacity={0.32} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// کنترلر حالت دکور: پرتاب پرتو، جای‌گذاری، برداشتن، حذف، چرخش
// ---------------------------------------------------------------------------
function DecorController() {
  const { camera, pointer } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const lastPlaceAt = useRef(0);
  const movingUid = useRef(null);

  // آپدیت ghost هر فریم (بیرون React)
  useFrame(() => {
    const state = usePlayerStore.getState();
    if (!state.decorMode) {
      if (decorWorld.ghost.visible) resetGhost();
      return;
    }
    const item = state.selectedDecor ? DECOR_BY_ID[state.selectedDecor] : null;
    if (!item) {
      decorWorld.ghost.visible = false;
      return;
    }

    raycaster.setFromCamera(pointer, camera);
    const hit = raycastTerrain(raycaster.ray.origin, raycaster.ray.direction, 90);
    if (!hit) {
      decorWorld.ghost.visible = false;
      return;
    }

    const ownerId = getDecorOwnerId();
    const check = canPlaceDecor(item, hit.x, hit.z, state.decorations, ownerId, movingUid.current);

    decorWorld.ghost.x = hit.x;
    decorWorld.ghost.y = getGroundHeight(hit.x, hit.z);
    decorWorld.ghost.z = hit.z;
    decorWorld.ghost.visible = true;
    decorWorld.ghost.valid = check.ok;
  });

  // چرخش و مقیاس با Q/E و +/- و لغو برداشتن با ESC
  useEffect(() => {
    const onKeyDown = (event) => {
      const state = usePlayerStore.getState();
      if (!state.decorMode || event.repeat) return;

      if (event.code === 'KeyQ') {
        event.preventDefault();
        decorWorld.rotation += Math.PI / 8;
      } else if (event.code === 'KeyE') {
        event.preventDefault();
        decorWorld.rotation -= Math.PI / 8;
      } else if (event.code === 'Equal' || event.code === 'NumpadAdd') {
        event.preventDefault();
        decorWorld.scale = Math.min(1.6, decorWorld.scale + 0.1);
      } else if (event.code === 'Minus' || event.code === 'NumpadSubtract') {
        event.preventDefault();
        decorWorld.scale = Math.max(0.6, decorWorld.scale - 0.1);
      } else if (event.code === 'Escape') {
        movingUid.current = null;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // کلیک چپ = جای‌گذاری/انتقال، راست‌کلیک = حذف، Shift+کلیک = برداشتن
  useEffect(() => {
    const onPointerDown = (event) => {
      const state = usePlayerStore.getState();
      if (!state.decorMode) return;
      if (event.target?.tagName !== 'CANVAS') return;

      const ownerId = getDecorOwnerId();
      const ghost = decorWorld.ghost;
      if (!ghost.visible) return;

      // راست‌کلیک: حذف آیتم خودمان نزدیک نشانگر
      if (event.button === 2) {
        event.preventDefault();
        const target = findOwnedDecorAt(state.decorations, ownerId, ghost.x, ghost.z, 2.4);
        if (target) {
          removeDecor(target.uid);
          playPositionalOneShot(PLACE_ITEM_SOUND, [ghost.x, 1, ghost.z], { volume: 0.6 });
          usePlayerStore.getState().pushToast('آیتم برداشته شد', 'info');
        }
        return;
      }

      if (event.button !== 0) return;

      // Shift+کلیک روی آیتم خودمان = برداشتن برای جابه‌جایی
      if (event.shiftKey && !movingUid.current) {
        const target = findOwnedDecorAt(state.decorations, ownerId, ghost.x, ghost.z, 2.4);
        if (target) {
          movingUid.current = target.uid;
          decorWorld.rotation = target.rotation || 0;
          decorWorld.scale = target.scale || 1;
          usePlayerStore.getState().pushToast('آیتم برداشته شد — جای جدید را کلیک کن', 'info');
          return;
        }
      }

      const now = Date.now();
      if (now - lastPlaceAt.current < DECOR_COOLDOWN) return;

      const item = state.selectedDecor ? DECOR_BY_ID[state.selectedDecor] : null;
      if (!item) return;

      const check = canPlaceDecor(item, ghost.x, ghost.z, state.decorations, ownerId, movingUid.current);
      if (!check.ok) {
        usePlayerStore.getState().pushToast(check.reason || 'نمی‌توان اینجا گذاشت', 'warn');
        return;
      }

      lastPlaceAt.current = now;

      if (movingUid.current) {
        const uid = movingUid.current;
        movingUid.current = null;
        moveDecor(uid, {
          x: ghost.x,
          z: ghost.z,
          rotation: decorWorld.rotation,
          scale: decorWorld.scale,
        });
        playPositionalOneShot(PLACE_ITEM_SOUND, [ghost.x, 1, ghost.z], { volume: 0.7 });
        return;
      }

      const placed = placeDecor({
        uid: newDecorUid(),
        id: item.id,
        x: ghost.x,
        z: ghost.z,
        rotation: decorWorld.rotation,
        scale: decorWorld.scale,
        ownerId,
      });
      if (!placed) {
        usePlayerStore.getState().pushToast(`سقف ${DECOR_LIMIT} آیتم پر است`, 'warn');
        return;
      }
      playPositionalOneShot(item.sound === 'tent' ? TENT_ZIP_SOUND : PLACE_ITEM_SOUND, [ghost.x, 1, ghost.z], {
        volume: 0.8,
      });
      const owned = countOwnedDecor(usePlayerStore.getState().decorations, ownerId);
      usePlayerStore.getState().pushToast(`${item.name} گذاشته شد (${owned}/${DECOR_LIMIT})`, 'success');
    };

    const onContextMenu = (event) => {
      if (!usePlayerStore.getState().decorMode) return;
      if (event.target?.tagName !== 'CANVAS') return;
      event.preventDefault();
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('contextmenu', onContextMenu);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('contextmenu', onContextMenu);
    };
  }, []);

  // خروج از حالت دکور: پاک‌سازی پیش‌نمایش
  const decorMode = usePlayerStore((s) => s.decorMode);
  useEffect(() => {
    if (!decorMode) {
      resetGhost();
      movingUid.current = null;
      decorWorld.rotation = 0;
      decorWorld.scale = 1;
    }
  }, [decorMode]);

  return null;
}

// ---------------------------------------------------------------------------
export default function DecorationsScene() {
  const decorations = usePlayerStore((s) => s.decorations);
  const selectedDecor = usePlayerStore((s) => s.selectedDecor);
  const decorMode = usePlayerStore((s) => s.decorMode);

  return (
    <group>
      <BoundsRing />
      {decorations.map((entry) => (
        <DecorItem key={entry.uid} entry={entry} />
      ))}
      {decorMode && selectedDecor && <GhostPreview key={selectedDecor} decorId={selectedDecor} />}
      <DecorController />
    </group>
  );
}
