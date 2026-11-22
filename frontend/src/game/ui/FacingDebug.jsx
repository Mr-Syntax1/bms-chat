import { usePlayerStore } from '../stores/usePlayerStore';
import { useSettingsStore } from '../stores/useSettingsStore';

const DEG = 180 / Math.PI;
const fmt = (rad) => `${(rad * DEG).toFixed(1)}°`;

/**
 * پنل دیباگ جهت کاراکتر (Ctrl+Shift+F).
 * با [ و ] آفست مدل فعلی زنده تغییر می‌کند و ذخیره می‌شود.
 */
export default function FacingDebug() {
  const debug = usePlayerStore((s) => s.facingDebug);
  const character = usePlayerStore((s) => s.character);
  const overrides = useSettingsStore((s) => s.facingOverrides);
  const setOverride = useSettingsStore((s) => s.setFacingOverride);
  const clearOverride = useSettingsStore((s) => s.clearFacingOverride);

  if (!debug) return null;

  const offset = overrides[character] ?? debug.offset ?? 0;

  return (
    <div className="pointer-events-auto absolute bottom-4 left-4 z-[95] w-[248px] rounded-xl border border-[#65F5A0]/30 bg-[#0d0b16]/92 p-3 font-mono text-[10px] leading-relaxed text-[#65F5A0] shadow-2xl backdrop-blur-xl">
      <div className="mb-1.5 flex items-center justify-between border-b border-[#65F5A0]/20 pb-1">
        <span className="font-bold">FACING DEBUG</span>
        <span className="text-[9px] text-[#f5ebdd]/40">Ctrl+Shift+F</span>
      </div>

      <div className="space-y-0.5">
        <div>
          <span className="text-[#f5ebdd]/45">model </span>
          {String(character).replace('.glb', '')}
        </div>
        <div>
          <span className="text-[#f5ebdd]/45">yaw </span>
          {fmt(debug.yaw)}
        </div>
        <div>
          <span className="text-[#f5ebdd]/45">offset </span>
          <span className="text-[#ffc66d]">{fmt(offset)}</span>
        </div>
        <div>
          <span className="text-[#f5ebdd]/45">final </span>
          {fmt(debug.yaw + offset)}
        </div>
        <div>
          <span className="text-[#f5ebdd]/45">moveDir </span>
          {fmt(debug.dir)}
        </div>
        <div>
          <span className="text-[#f5ebdd]/45">speed </span>
          {(debug.speed ?? 0).toFixed(2)}
        </div>
      </div>

      <div className="mt-2 flex gap-1">
        <button
          type="button"
          onClick={() => setOverride(character, offset - Math.PI / 36)}
          className="flex-1 rounded border border-white/15 bg-white/5 py-0.5 text-[#f5ebdd] hover:bg-white/10"
        >
          [ −5°
        </button>
        <button
          type="button"
          onClick={() => setOverride(character, offset + Math.PI / 36)}
          className="flex-1 rounded border border-white/15 bg-white/5 py-0.5 text-[#f5ebdd] hover:bg-white/10"
        >
          ] +5°
        </button>
      </div>
      <button
        type="button"
        onClick={() => clearOverride(character)}
        className="mt-1 w-full rounded border border-[#ef4444]/30 bg-[#ef4444]/10 py-0.5 text-[9px] text-[#ffb4b4] hover:bg-[#ef4444]/20"
      >
        reset
      </button>
    </div>
  );
}
