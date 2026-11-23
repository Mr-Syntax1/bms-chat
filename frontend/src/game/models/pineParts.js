import './setupDraco';
import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { modelUrl } from '../assetManifest';

/**
 * قطعات یک GLB برای InstancedMesh.
 * مدل را وسط‌چین می‌کند تا چیدمان ساده باشد.
 */
export function usePineModel(url = modelUrl('trees.pineOpt')) {
  const { scene } = useGLTF(url);

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
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    return {
      parts,
      height: size.y || 10.24,
      baseY: -box.min.y,
      centerX: center.x,
      centerZ: center.z,
    };
  }, [scene]);
}

// preload با کلید manifest (مسیر خام اینجا نوشته نمی‌شود)
['trees.pineOpt', 'trees.pine', 'trees.pine2'].forEach((key) => {
  const url = modelUrl(key);
  if (url) useGLTF.preload(url);
});
