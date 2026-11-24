// اسکرین‌شات headless با CDP خام. موقت — بعد از تأیید پاک می‌شود.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import WebSocket from 'ws';
import sharp from 'sharp';

const CHROME = 'C:/Users/pc-11/AppData/Local/Google/Chrome/Application/chrome.exe';
const OUT = path.resolve(process.env.SHOT_OUT || '../dock/shots');
const PREFIX = process.env.SHOT_PREFIX || 'glb';
const PORT = 9333;
const URL_BASE = process.env.PROBE_URL || 'http://localhost:5199/probe.html';

const SHOTS = [
  { name: 'a-camp', cam: '0,2.6,7', look: '0,1.2,-2' },
  { name: 'b-forest-tall', cam: '-6,7,14', look: '-22,9,-30' },
  { name: 'c-pond', cam: '-48,6,-18', look: '-62,0,-34' },
  { name: 'd-beach', cam: '40,6,0', look: '80,-1,0' },
];

fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitJson(url, tries = 80) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch { /* not up */ }
    await sleep(250);
  }
  throw new Error('CDP unavailable: ' + url);
}

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.on('message', (raw) => {
      const m = JSON.parse(raw.toString());
      if (m.id && this.pending.has(m.id)) {
        const { resolve, reject } = this.pending.get(m.id);
        this.pending.delete(m.id);
        if (m.error) reject(new Error(m.error.message));
        else resolve(m.result);
      }
    });
  }
  send(method, params = {}, sessionId = null) {
    this.id += 1;
    const id = this.id;
    const msg = { id, method, params };
    if (sessionId) msg.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(msg));
    });
  }
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, { perMessageDeflate: false });
    ws.on('open', () => resolve(new CDP(ws)));
    ws.on('error', reject);
  });
}

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  '--hide-scrollbars', '--mute-audio',
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox',
  '--window-size=1280,720', '--allow-insecure-localhost', 'about:blank',
], { stdio: 'ignore' });

const stats = { meshes: 0, instanced: 0, tris: 0, grass: 0, trees: 0 };
let ok = 0;
try {
  const version = await waitJson(`http://127.0.0.1:${PORT}/json/version`);
  const cdp = await connect(version.webSocketDebuggerUrl);
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const s = { send: (m, p = {}) => cdp.send(m, p, sessionId) };

  await s.send('Page.enable');
  await s.send('Runtime.enable');
  await s.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });

  for (const shot of SHOTS) {
    await s.send('Page.navigate', { url: `${URL_BASE}?q=high&cam=${shot.cam}&look=${shot.look}` });
    let ready = false;
    for (let i = 0; i < 100; i += 1) {
      await sleep(500);
      const r = await s.send('Runtime.evaluate', {
        expression: 'Boolean(window.__probe && window.__probe.gl.info.render.calls > 0)',
        returnByValue: true,
      });
      if (r.result.value === true) { ready = true; break; }
    }
    await sleep(1500);

    const info = await s.send('Runtime.evaluate', {
      expression: `(() => {
        const p = window.__probe; if (!p) return null;
        let meshes = 0, instanced = 0, tris = 0, grass = 0, trees = 0;
        p.scene.traverse((o) => {
          const c = o.isInstancedMesh ? o.count : 1;
          const g = o.geometry;
          if (o.isMesh && g) {
            meshes += 1;
            if (o.isInstancedMesh) instanced += 1;
            tris += ((g.index ? g.index.count : g.attributes.position.count) / 3) * c;
          }
          if (o.name && o.name.startsWith('grass-')) grass = Math.max(grass, c);
          if (o.name && o.name.startsWith('trees-near-')) trees += (o.isInstancedMesh ? c : 0);
        });
        return { meshes, instanced, tris: Math.round(tris), grass, trees, calls: p.gl.info.render.calls };
      })()`,
      returnByValue: true,
    });

    let data;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await s.send('Runtime.evaluate', {
        expression: `(() => { const p = window.__probe; if (!p) return false; p.camera.updateMatrixWorld(true); p.gl.render(p.scene, p.camera); return true; })()`,
        returnByValue: true,
      });
      await sleep(300);
      ({ data } = await s.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }));
      const px = await sharp(Buffer.from(data, 'base64')).raw().toBuffer({ resolveWithObject: true });
      const n = px.info.width * px.info.height;
      let sum = 0, sum2 = 0;
      for (let i = 0; i < n; i += 1) {
        const o = i * px.info.channels;
        const l = 0.2126 * px.data[o] + 0.7152 * px.data[o + 1] + 0.0722 * px.data[o + 2];
        sum += l; sum2 += l * l;
      }
      const sd = Math.sqrt(sum2 / n - (sum / n) ** 2);
      if (sd > 3) break;
    }

    const file = path.join(OUT, `${PREFIX}-${shot.name}.png`);
    fs.writeFileSync(file, Buffer.from(data, 'base64'));
    const v = info.result.value;
    if (v) Object.assign(stats, v);
    console.log(`[${ready ? 'OK' : 'TIMEOUT'}] ${shot.name.padEnd(14)} meshes=${v?.meshes} instanced=${v?.instanced} tris=${v?.tris} treeInst=${v?.trees} grass=${v?.grass} calls=${v?.calls} -> ${file}`);
    if (ready) ok += 1;
  }
  console.log(`\nafter: meshes=${stats.meshes} instanced=${stats.instanced} tris=${stats.tris} calls=${stats.calls}`);
  console.log(`shots: ${ok}/${SHOTS.length}`);
} catch (err) {
  console.error('PROBE FAILED:', err.message);
  process.exitCode = 1;
} finally {
  chrome.kill();
}
