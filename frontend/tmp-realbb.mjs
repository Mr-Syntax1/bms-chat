import fs from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three-stdlib";
globalThis.self = globalThis;
const loader=new GLTFLoader();
const load=(f)=>{const b=fs.readFileSync(f);const ab=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);return new Promise((res,rej)=>loader.parse(ab,"",res,rej));};
for(const name of fs.readdirSync("public/game-models/characters")){
  if(!name.endsWith(".glb"))continue;
  const g=await load("public/game-models/characters/"+name);const s=g.scene;s.updateWorldMatrix(true,true);
  const b1=new THREE.Box3().setFromObject(s);
  // recompute per-geometry from vertices
  s.traverse(o=>{ if(o.isMesh&&o.geometry){ o.geometry.boundingBox=null; o.geometry.boundingSphere=null; o.geometry.computeBoundingBox(); }});
  const b2=new THREE.Box3().setFromObject(s);
  const s1=new THREE.Vector3(),s2=new THREE.Vector3();b1.getSize(s1);b2.getSize(s2);
  console.log(name.padEnd(28),`posX0 bbox h=${s1.y.toFixed(2)} w=${s1.x.toFixed(2)} d=${s1.z.toFixed(2)} minY=${b1.min.y.toFixed(2)}  |  real h=${s2.y.toFixed(2)} w=${s2.x.toFixed(2)} d=${s2.z.toFixed(2)} minY=${b2.min.y.toFixed(2)}`);
}
