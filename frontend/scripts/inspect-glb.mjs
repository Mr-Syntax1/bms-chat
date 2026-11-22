import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
if (!dir) {
  console.error('usage: node inspect-glb.mjs <dir>');
  process.exit(1);
}

function readGlbJson(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32LE(0) !== 0x46546c67) return null;
  const length = buf.readUInt32LE(12);
  const type = buf.readUInt32LE(16);
  if (type !== 0x4e4f534a) return null;
  return JSON.parse(buf.subarray(20, 20 + length).toString('utf8'));
}

for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) continue;
  if (!entry.name.toLowerCase().endsWith('.glb')) continue;

  let json;
  try {
    json = readGlbJson(full);
  } catch (err) {
    console.log(`\n=== ${entry.name} : parse error ${err.message}`);
    continue;
  }
  if (!json) {
    console.log(`\n=== ${entry.name} : not a GLB`);
    continue;
  }

  const nodes = json.nodes || [];
  const anims = json.animations || [];
  const meshes = json.meshes || [];
  const boneNames = nodes.map((n) => n.name).filter(Boolean);
  const handNode = boneNames.find((n) => /hand/i.test(n)) || null;
  const hips = boneNames.find((n) => /hips|pelvis/i.test(n)) || null;

  console.log(`\n=== ${entry.name}`);
  console.log(`  nodes=${nodes.length} meshes=${meshes.length} anims=${anims.length}`);
  console.log(`  hand=${handNode || '-'} hips=${hips || '-'}`);
  console.log(`  anims: ${anims.map((a) => a.name).join(', ') || '-'}`);
  const sample = boneNames.slice(0, 12);
  console.log(`  nodeSample: ${sample.join(', ')}`);
}
