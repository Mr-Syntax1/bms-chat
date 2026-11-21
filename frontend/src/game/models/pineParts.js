import './setupDraco';
import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const PINE_URL = '/game-models/opt/Pine.glb';

/**
 * قطعات مدل کاج (تنه + برگ) برای InstancedMesh.
 * bounds از هندسه‌ی واقعی محاسبه می‌شود تا ارتفاع/پایین‌ترین نقطه دقیق باشد.
 */
export function usePineModel() {
  const { scene } = useGLTF(PINE_URL);

  return useMemo(() => {
    scene.updateWorldMatrix(true, true);

    const parts = [];
    const box = new THREE.Box3();
    const tmp = new THREE.Box3();

    scene.traverse((child) => {
      if (!child.isMesh || !child.geometry) return;

      child.geometry.computeBoundingBox();
      tmp.copy(child.geometry.boundingBox).applyMatrix4(child.matrixWorld);
      box.union(tmp);

      parts.push({
        geometry: child.geometry,
        material: child.material,
        matrix: child.matrixWorld.clone(),
      });
    });

    const size = new THREE.Vector3();
    box.getSize(size);

    return {
      parts,
      height: size.y || 10.24,
      baseY: -box.min.y,
    };
  }, [scene]);
}

useGLTF.preload(PINE_URL);
