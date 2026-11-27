import fs from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three-stdlib";
globalThis.self = globalThis;
const loader=new GLTFLoader();
const load=(f)=>{const b=fs.readFileSync(f);const ab=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);return new Promise((res,rej)=>loader.parse(ab,"",res,rej));};
const g=await load("public/game-models/characters/cute_axolotl.glb");
const s=g.scene;s.updateWorldMatrix(true,true);
s.traverse(o=>{
  if(!o.isMesh)return;
  o.geometry.computeBoundingBox();
  const bb=o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
  console.log(o.name,"geomBB world y",bb.min.y.toFixed(2),bb.max.y.toFixed(2),"| matrix scale", new THREE.Vector3().setFromMatrixScale(o.matrixWorld).toArray().map(x=>x.toFixed(2)));
});
console.log("---- full node tree ----");
function dump(o,d=0){
  const t=o.position.toArray().map(x=>x.toFixed(2));
  const sc=o.scale.toArray().map(x=>x.toFixed(2));
  const rot=[o.rotation.x,o.rotation.y,o.rotation.z].map(x=>x.toFixed(2));
  console.log("  ".repeat(d)+`${o.type} "${o.name}" pos=[${t}] scale=[${sc}] rot=[${rot}] visible=${o.visible}`);
  o.children.forEach(c=>dump(c,d+1));
}
dump(s);
