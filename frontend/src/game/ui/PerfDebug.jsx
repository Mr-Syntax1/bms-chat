import { useEffect, useState } from 'react';
import { perfStats } from '../debugStats';
import { chunkStats } from '../world/ChunkManager';
import { useSettingsStore } from '../stores/useSettingsStore';
import { TREE_MODEL_BYTES } from '../models/pineParts';

// هر ۰.۵ ثانیه مقادیر را از ماژول‌های mutable می‌خواند (بدون setState در حلقه‌ی فریم)
function useSlowStats(active) {
  const [snap, setSnap] = useState(null);
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => {
      setSnap({
        ...perfStats,
        chunks: chunkStats.chunks,
        trees: chunkStats.trees,
        lod0: chunkStats.lod0,
        lod1: chunkStats.lod1,
        lod2: chunkStats.lod2,
        flora: chunkStats.flora,
      });
    }, 500);
    return () => clearInterval(id);
  }, [active]);
  return snap;
}

const KB = (bytes) => `${(bytes / 1024).toFixed(0)}KB`;

/**
 * پنل دیباگ کارایی (Ctrl+Shift+P).
 * FPS، فریم‌تایم، draw call، مثلث، چانک‌های فعال، درختان و فلور.
 */
export default function PerfDebug() {
  const [open, setOpen] = useState(false);
  const quality = useSettingsStore((s) => s.quality);
  const snap = useSlowStats(open);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.ctrlKey && event.shiftKey && event.code === 'KeyP') {
        event.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (!open || !snap) return null;

  const fpsColor = snap.fps >= 55 ? '#65F5A0' : snap.fps >= 40 ? '#ffc66d' : '#ff8f8f';

  return (
    <div className="pointer-events-none absolute right-4 top-4 z-[95] w-[214px] rounded-xl border border-[#65F5A0]/30 bg-[#0d0b16]/92 p-3 font-mono text-[10px] leading-relaxed text-[#f5ebdd] shadow-2xl backdrop-blur-xl">
      <div className="mb-1.5 border-b border-[#65F5A0]/20 pb-1 font-bold text-[#65F5A0]">
        PERF <span className="ml-1 text-[9px] text-[#f5ebdd]/40">Ctrl+Shift+P</span>
      </div>
      <div className="space-y-0.5">
        <div className="flex justify-between">
          <span className="text-[#f5ebdd]/45">fps</span>
          <span style={{ color: fpsColor }}>{snap.fps}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#f5ebdd]/45">frame</span>
          <span>{snap.frameMs.toFixed(1)} ms</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#f5ebdd]/45">draw calls</span>
          <span>{snap.drawCalls}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#f5ebdd]/45">tris</span>
          <span>{(snap.triangles / 1000).toFixed(1)}k</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#f5ebdd]/45">programs</span>
          <span>{snap.programs}</span>
        </div>
        <div className="mt-1 border-t border-white/10 pt-1 flex justify-between">
          <span className="text-[#f5ebdd]/45">chunks</span>
          <span>{snap.chunks}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#f5ebdd]/45">trees</span>
          <span>{snap.trees}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#f5ebdd]/45">lod 0/1/2</span>
          <span>
            {snap.lod0}/{snap.lod1}/{snap.lod2}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#f5ebdd]/45">tree model</span>
          <span className="text-[#9ad0ff]">{KB(TREE_MODEL_BYTES)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#f5ebdd]/45">flora</span>
          <span>{snap.flora}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#f5ebdd]/45">quality</span>
          <span className="text-[#ffc66d]">{quality}</span>
        </div>
      </div>
    </div>
  );
}
