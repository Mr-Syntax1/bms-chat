import { Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { KeyboardControls, AdaptiveDpr, Preload, PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import CozyScene from './components/CozyScene';
import PlayerController from './components/PlayerController';
import RemotePlayers from './components/RemotePlayers';
import AudioRoot from './components/AudioRoot';
import { useGameSync } from './hooks/useGameSync';
import { KEY_MAP } from './controls';
import { useSettingsStore, useQualityPreset } from './stores/useSettingsStore';
import { tickPerf } from './debugStats';

// پایین‌آوردن خودکار کیفیت تنها پس از افت پایدار (نه یک فریم کند)
let downgradeCooldown = 0;

// شمارنده‌ی کارایی: هر فریم آمار سبک را در debugStats می‌ریزد (بدون رندر React)
function PerfProbe() {
  useFrame(({ gl }, delta) => tickPerf(gl, delta));
  return null;
}

export default function GameCanvas({ roomId, user, look, active = true }) {
  // سینک Ably در بالاترین سطح کامپوننت بازی
  useGameSync({ roomId, user, enabled: Boolean(roomId && user?.id) });

  const preset = useQualityPreset();
  const setQuality = useSettingsStore((s) => s.setQuality);

  const handleDecline = (api) => {
    // هیسترزیس: فقط اگر FPS مدتی پایین بماند و کیفیت بالاتر از کم باشد
    const fps = api?.fps ?? 0;
    const now = Date.now();
    if (fps > 42 || now < downgradeCooldown) return;
    const { quality, controls } = useSettingsStore.getState();
    if (!controls.autoQuality) return;
    const ladder = { ultra: 'high', high: 'medium', medium: 'low' };
    const next = ladder[quality];
    if (next) {
      setQuality(next);
      downgradeCooldown = now + 12000;
    }
  };

  return (
    <KeyboardControls map={KEY_MAP}>
      <Canvas
        shadows={false}
        dpr={[1, preset.dpr]}
        camera={{ position: [0, 2.2, 4], fov: 62, near: 0.1, far: 400 }}
        gl={{
          antialias: preset.dpr >= 1.25,
          powerPreference: 'high-performance',
          alpha: false,
          stencil: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor('#070d1c');
          // ⚠️ سایه کاملاً خاموش (پاس کارایی ۵.۱) — هیچ نور سایه‌اندازی رندر نمی‌شود
          gl.shadowMap.enabled = false;
        }}
      >
        {/* AudioListener باید قبل از افکت‌های صدای محیطی ساخته شود */}
        <AudioRoot />
        {/* مرز Suspense مشترک فقط برای صحنه + Preload: کامپایل شیدرها یک‌بار
            انجام می‌شود و با لود شدن یک مدل جدید (غذا/ریموت) تکرار نمی‌شود.
            قبلاً همه‌چیز در یک مرز بود و هر تعامل کل صحنه را remount می‌کرد
            و gl.compile مجدد ۳-۴ ثانیه فریز می‌ساخت. */}
        <Suspense fallback={null}>
          <CozyScene />
          <Preload all />
        </Suspense>
        {/* کنترلر و بازیکنان ریموت بیرون از آن مرز تا هرگز unmount نشوند */}
        <PlayerController roomId={roomId} user={user} look={look} active={active} />
        <Suspense fallback={null}>
          <RemotePlayers />
        </Suspense>
        <AdaptiveDpr pixelated />
        {/* شمارنده‌ی کارایی برای پنل دیباگ (Ctrl+Shift+P) */}
        <PerfProbe />
        {/* نظارت بر فریم‌تایم برای پیشنهاد کاهش کیفیت (هیسترزیس داخلی) */}
        <PerformanceMonitor iterations={8} ms={500} onDecline={handleDecline} />
      </Canvas>
    </KeyboardControls>
  );
}
