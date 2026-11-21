import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { ensureAudio, disposeAudio } from '../audio';

// AudioListener مشترک را قبل از افکت‌های صدای محیطی آماده می‌کند.
// ensureAudio ایدمپوتنت است؛ در StrictMode دوبار اجرا شدن مشکلی ایجاد نمی‌کند.
export default function AudioRoot() {
  const { scene, camera } = useThree();

  useEffect(() => {
    ensureAudio(scene, camera);
    return () => {
      disposeAudio();
    };
  }, [scene, camera]);

  return null;
}
