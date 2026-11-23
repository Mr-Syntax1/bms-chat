import { useEffect } from 'react';
import { useSettingsStore, QUALITY_PRESETS, suggestQuality } from '../stores/useSettingsStore';
import { GlassPanel, Slider, SegmentedControl, Toggle, GhostButton, PrimaryButton } from './primitives';

const QUALITY_OPTIONS = [
  { value: 'low', label: 'کم' },
  { value: 'medium', label: 'متوسط' },
  { value: 'high', label: 'زیاد' },
];

const WEATHER_OPTIONS = [
  { value: 'clear', label: 'صاف' },
  { value: 'rain', label: 'بارانی' },
];

/**
 * پنل تنظیمات: گرافیک، صدا، کنترل.
 * تغییرات فوری اعمال و در localStorage ذخیره می‌شوند.
 */
export default function SettingsPanel({ onClose }) {
  const quality = useSettingsStore((s) => s.quality);
  const audio = useSettingsStore((s) => s.audio);
  const controls = useSettingsStore((s) => s.controls);
  const weather = useSettingsStore((s) => s.weather);
  const setQuality = useSettingsStore((s) => s.setQuality);
  const setAudio = useSettingsStore((s) => s.setAudio);
  const setControls = useSettingsStore((s) => s.setControls);
  const setWeather = useSettingsStore((s) => s.setWeather);

  // بستن با ESC
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code === 'Escape') {
        event.stopPropagation();
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onClose]);

  const preset = QUALITY_PRESETS[quality];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* پرده‌ی بنفش تیره */}
      <button
        type="button"
        aria-label="بستن تنظیمات"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-[#0d0b16]/80 backdrop-blur-sm cozy-fade-in"
      />

      <GlassPanel className="relative z-10 w-full max-w-md max-h-[86vh] overflow-y-auto p-5 cozy-pop-in">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-[#f5ebdd]">تنظیمات</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/12 text-[#f5ebdd]/70 hover:bg-white/10 hover:text-[#f5ebdd]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ---- گرافیک ---- */}
        <section className="mb-5">
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#ffc66d]/80">گرافیک</h3>
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[11px] text-[#f5ebdd]/70">کیفیت</span>
            <SegmentedControl options={QUALITY_OPTIONS} value={quality} onChange={setQuality} />
          </div>

          <div className="mb-2 grid grid-cols-2 gap-1.5 text-[10px] text-[#f5ebdd]/50">
            <span>سایه: {preset.shadows ? 'روشن' : 'خاموش'}</span>
            <span>بلوم: {preset.bloom ? 'روشن' : 'خاموش'}</span>
            <span>درختان: {preset.treeDensity}</span>
            <span>کرم شب‌تاب: {preset.fireflies}</span>
          </div>

          <Toggle
            label="تنظیم خودکار کیفیت بر اساس کارایی"
            checked={controls.autoQuality}
            onChange={(v) => setControls({ autoQuality: v })}
          />
          <div className="mt-1 flex justify-end">
            <GhostButton className="!px-3 !py-1 !text-[10px]" onClick={() => setQuality(suggestQuality())}>
              پیشنهاد برای این دستگاه
            </GhostButton>
          </div>
        </section>

        {/* ---- آب‌وهوا ---- */}
        <section className="mb-5">
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#ffc66d]/80">آب‌وهوا</h3>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#f5ebdd]/70">وضعیت هوا</span>
            <SegmentedControl options={WEATHER_OPTIONS} value={weather} onChange={setWeather} />
          </div>
        </section>

        {/* ---- صدا ---- */}
        <section className="mb-5 space-y-2.5">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#ffc66d]/80">صدا</h3>
          <Slider label="صدای کل" value={audio.master} onChange={(v) => setAudio({ master: v })} />
          <Slider label="محیط (جیرجیرک)" value={audio.ambient} onChange={(v) => setAudio({ ambient: v })} />
          <Slider label="آتش" value={audio.fire} onChange={(v) => setAudio({ fire: v })} />
          <Slider label="افکت‌ها" value={audio.effects} onChange={(v) => setAudio({ effects: v })} />
          <Slider label="صدای دوستان" value={audio.voice} onChange={(v) => setAudio({ voice: v })} />
        </section>

        {/* ---- کنترل ---- */}
        <section className="mb-4 space-y-2.5">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#ffc66d]/80">کنترل</h3>
          <Slider
            label="حساسیت دوربین"
            value={controls.lookSensitivity}
            min={0.3}
            max={2.5}
            step={0.1}
            format={(v) => `${v.toFixed(1)}×`}
            onChange={(v) => setControls({ lookSensitivity: v })}
          />
          <Toggle
            label="معکوس کردن محور عمودی"
            checked={controls.invertY}
            onChange={(v) => setControls({ invertY: v })}
          />
        </section>

        <div className="mb-4 rounded-xl border border-white/8 bg-black/20 p-3 text-[10px] leading-relaxed text-[#f5ebdd]/55">
          <div className="mb-1 font-bold text-[#f5ebdd]/75">کلیدها</div>
          <div>WASD حرکت • Shift دویدن • موس چرخش دوربین</div>
          <div>E تعامل/نشستن • G گیتار • M مارشمالو</div>
          <div>1–5 ایموت • F چراغ ون • ESC توقف</div>
        </div>

        <PrimaryButton className="w-full" onClick={onClose}>
          ذخیره و بازگشت
        </PrimaryButton>
      </GlassPanel>
    </div>
  );
}
