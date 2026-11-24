// temp: per-group triangle / draw-call breakdown via CDP
import { spawn } from 'node:child_process';
import WebSocket from 'ws';

const CHROME = 'C:/Users/pc-11/AppData/Local/Google/Chrome/Application/chrome.exe';
const PORT = 9444;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitJson(url, tries = 80) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch { /* not up */ }
    await sleep(250);
  }
  throw new Error('CDP unavailable');
}

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  '--hide-scrollbars', '--mute-audio', '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader', '--disable-gpu-sandbox',
  '--window-size=1280,720', 'about:blank',
], { stdio: 'ignore' });

try {
  const version = await waitJson(`http://127.0.0.1:${PORT}/json/version`);
  const ws = new WebSocket(version.webSocketDebuggerUrl, { perMessageDeflate: false });
  let id = 0;
  const pending = new Map();
  ws.on('message', (raw) => {
    const m = JSON.parse(raw.toString());
    if (m.id && pending.has(m.id)) {
      const { resolve } = pending.get(m.id);
      pending.delete(m.id);
      resolve(m.result);
    }
  });
  await new Promise((r) => ws.on('open', r));
  const send = (method, params = {}, sessionId = null) => {
    id += 1;
    const msg = { id, method, params };
    if (sessionId) msg.sessionId = sessionId;
    return new Promise((resolve) => {
      pending.set(id, { resolve });
      ws.send(JSON.stringify(msg));
    });
  };

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const s = (m, p = {}) => send(m, p, sessionId);
  await s('Page.enable');
  await s('Runtime.enable');
  await s('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await s('Page.navigate', { url: 'http://localhost:5199/probe.html?q=high&cam=-6,7,14&look=-22,9,-30' });

  for (let i = 0; i < 100; i += 1) {
    await sleep(500);
    const r = await s('Runtime.evaluate', {
      expression: 'Boolean(window.__probe && window.__probe.gl.info.render.calls > 0)',
      returnByValue: true,
    });
    if (r.result.value) break;
  }
  await sleep(2000);

  const out = await s('Runtime.evaluate', {
    expression: `(() => {
      const p = window.__probe; if (!p) return null;
      const tri = (o) => {
        const g = o.geometry;
        const base = (g.index ? g.index.count : g.attributes.position.count) / 3;
        return base * (o.isInstancedMesh ? o.count : 1);
      };
      const groups = {};
      const add = (k, o) => {
        if (!groups[k]) groups[k] = { meshes: 0, inst: 0, tris: 0 };
        groups[k].meshes += 1;
        if (o.isInstancedMesh) groups[k].inst = Math.max(groups[k].inst, o.count);
        groups[k].tris += tri(o);
      };
      let total = 0, meshes = 0;
      p.scene.traverse((o) => {
        if (!o.isMesh || !o.geometry) return;
        meshes += 1;
        total += tri(o);
        let node = o;
        let label = null;
        while (node) {
          if (node.name && /^(trees|grass)-/.test(node.name)) { label = node.name.replace(/-\\d+$/, ''); break; }
          node = node.parent;
        }
        add(label || 'other', o);
      });
      p.gl.info.autoReset = false;
      p.gl.info.reset();
      p.gl.render(p.scene, p.camera);
      const calls = p.gl.info.render.calls;
      const renderedTris = p.gl.info.render.triangles;
      return { meshes, total: Math.round(total), calls, renderedTris, groups };
    })()`,
    returnByValue: true,
  });
  console.log(JSON.stringify(out.result.value, null, 2));
} finally {
  chrome.kill();
}
