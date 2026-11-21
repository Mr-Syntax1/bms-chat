import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';

/**
 * یک کلون از صحنه‌ی GLB برمی‌گرداند.
 * هندسه و متریال بین نمونه‌ها به اشتراک گذاشته می‌شود (مصرف حافظه کم)
 * و سایه‌ها برای همه‌ی مش‌ها فعال می‌شوند.
 */
export function useModelClone(url) {
  const { scene } = useGLTF(url);
  return useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });
    return clone;
  }, [scene]);
}
