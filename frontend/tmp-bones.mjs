import fs from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three-stdlib";
globalThis.self = globalThis;
const loader = new GLTFLoader();
const load=(f)=>{const b=fs.readFileSync(f);const ab=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);return new Promise((res,rej)=>loader.parse(ab,"",res,rej));};
for(const name of ["cute_cat_in_cute_banana.glb","cute_gugugaga.glb"]){
  const g=await load("public/game-models/characters/"+name);
  const s=g.scene;s.updateWorldMatrix(true,true);
  console.log("\n=== "+name);
  const v=new THREE.Vector3();
  s.traverse(o=>{ if(o.isBone){o.getWorldPosition(v);console.log(`  bone ${o.name} pos=[${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}] children=${o.children.map(c=>c.name).join(",")}`);} });
  console.log("animations:",g.animations.map(a=>`${a.name} dur=${a.duration.toFixed(2)} tracks=${a.tracks.length}`).join(" | "));
  for(const a of g.animations){
    const head=a.tracks.filter(t=>/Head|head/i.test(t.name));
    if(head.length) console.log("  head tracks:",head.map(t=>t.name).join(", "));
  }
}
