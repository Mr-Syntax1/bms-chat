const fs = require('fs');
const path = require('path');

function readGlb(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32LE(0) !== 0x46546c67) return { error: 'not glb' };
  let offset = 12;
  let json = null;
  while (offset < buf.length) {
    const len = buf.readUInt32LE(offset);
    const type = buf.readUInt32LE(offset + 4);
    const data = buf.subarray(offset + 8, offset + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(data.toString('utf8'));
    offset += 8 + len + ((4 - (len % 4)) % 4);
  }
  if (!json) return { error: 'no json' };

  const anims = (json.animations || []).map((a) => a.name || '(unnamed)');
  const meshCount = (json.meshes || []).length;
  const nodeCount = (json.nodes || []).length;
  const matCount = (json.materials || []).length;
  const texCount = (json.textures || []).length;

  // bounding box از accessor های POSITION
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];
  for (const mesh of json.meshes || []) {
    for (const prim of mesh.primitives || []) {
      const acc = json.accessors?.[prim.attributes?.POSITION];
      if (!acc?.min || !acc?.max) continue;
      for (let i = 0; i < 3; i += 1) {
        min[i] = Math.min(min[i], acc.min[i]);
        max[i] = Math.max(max[i], acc.max[i]);
      }
    }
  }

  const rootNodes = (json.scenes?.[json.scene ?? 0]?.nodes || []).map((i) => json.nodes[i]?.name);
  return {
    animations: anims,
    meshes: meshCount,
    nodes: nodeCount,
    materials: matCount,
    textures: texCount,
    roots: rootNodes,
    bbox: min[0] === Infinity ? null : {
      size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]].map((v) => Math.round(v * 100) / 100),
      min: min.map((v) => Math.round(v * 100) / 100),
      max: max.map((v) => Math.round(v * 100) / 100),
    },
  };
}

const root = process.argv[2];
for (const dir of fs.readdirSync(root)) {
  const dirPath = path.join(root, dir);
  if (!fs.statSync(dirPath).isDirectory()) continue;
  for (const f of fs.readdirSync(dirPath)) {
    if (!f.toLowerCase().endsWith('.glb')) continue;
    const info = readGlb(path.join(dirPath, f));
    console.log(`\n=== ${dir}/${f}`);
    console.log(JSON.stringify(info, null, 1));
  }
}
