import { useEffect, useRef, useState } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';

const BASE_SENSITIVITY = 0.0022;
const PITCH_LIMIT = (60 * Math.PI) / 180; // -۶۰ تا +۶۰ درجه

/**
 * قفل نشانگر موس + نگه‌داشتن yaw/pitch در ref.
 * - با کلیک Start، document.body.requestPointerLock()
 * - با ESC، قفل آزاد و onExit صدا زده می‌شود
 * - yaw/pitch برای اعمال در useFrame در دسترس‌اند (بدون re-render)
 */
export function usePointerLook({ onExit } = {}) {
  const yaw = useRef(0);
  const pitch = useRef(-0.12);
  const [locked, setLocked] = useState(false);
  const onExitRef = useRef(onExit);

  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  useEffect(() => {
    const onPointerLockChange = () => {
      const isLocked = document.pointerLockElement === document.body;
      setLocked(isLocked);
      if (!isLocked) onExitRef.current?.();
    };

    const onMouseMove = (event) => {
      if (document.pointerLockElement !== document.body) return;
      // حساسیت/معکوس‌سازی را زنده از استور می‌خوانیم تا اسلایدر بلافاصله اثر کند
      const { lookSensitivity, invertY } = useSettingsStore.getState().controls;
      const sensitivity = BASE_SENSITIVITY * (Number(lookSensitivity) || 1);
      const vertical = invertY ? -event.movementY : event.movementY;
      yaw.current -= event.movementX * sensitivity;
      pitch.current -= vertical * sensitivity;
      pitch.current = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch.current));
    };

    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('mousemove', onMouseMove);
    return () => {
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      document.removeEventListener('mousemove', onMouseMove);
      if (document.pointerLockElement === document.body) document.exitPointerLock?.();
    };
  }, []);

  const lock = () => {
    if (document.pointerLockElement === document.body) return;
    document.body.requestPointerLock?.();
  };

  const unlock = () => {
    if (document.pointerLockElement === document.body) document.exitPointerLock?.();
  };

  return { yaw, pitch, locked, lock, unlock };
}
