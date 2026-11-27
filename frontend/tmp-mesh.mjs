import fs from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three-stdlib";
globalThis.self = globalThis;
const loader = new GLTFLoader();
const load=(f)=>{const b=fs.readFileSync(f);const ab=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);return new Promise((res,rej)=>loader.parse(ab,"",res,rej));};
for(const name of fs.readdirSync("public/game-models/characters")){
  if(!name.endsWith(".glb"))continue;
  const g=await load("public/game-models/characters/"+name);
  const s=g.scene;s.updateWorldMatrix(true,true);
  console.log("\n=== "+name);
  s.traverse(o=>{
    if(!o.isMesh)return;
    const b=new THREE.Box3().setFromObject(o);
    const sz=new THREE.Vector3();b.getSize(sz);
    const c=new THREE.Vector3();b.getCenter(c);
    const mat=Array.isArray(o.material)?o.material[0]:o.material;
    console.log(`  mesh "${o.name}" size=[${sz.x.toFixed(2)},${sz.y.toFixed(2)},${sz.z.toFixed(2)}] center=[${c.x.toFixed(2)},${c.y.toFixed(2)},${c.z.toFixed(2)}] mat=${mat?.name||"-"} color=#${mat?.color?.getHexString?.()||"-"}`);
  });
}
