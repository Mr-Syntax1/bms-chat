import fs from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three-stdlib";
globalThis.self = globalThis;
const loader=new GLTFLoader();
const load=(f)=>{const b=fs.readFileSync(f);const ab=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);return new Promise((res,rej)=>loader.parse(ab,"",res,rej));};
const g=await load("public/game-models/characters/cute_axolotl.glb");
const s=g.scene;s.updateWorldMatrix(true,true);
const v=new THREE.Vector3();
s.traverse(o=>{
  if(!o.isMesh)return;
  const p=o.geometry.attributes.position;
  let mn=Infinity,mx=-Infinity;
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);mn=Math.min(mn,v.y);mx=Math.max(mx,v.y);}
  console.log(o.name,"verts",p.count,"worldY",mn.toFixed(2),mx.toFixed(2),"parent",o.parent?.name,"isSkinned",!!o.isSkinnedMesh,"geomType",o.geometry.type);
});
const box=new THREE.Box3().setFromObject(s);
console.log("scene bbox y",box.min.y.toFixed(2),box.max.y.toFixed(2));
