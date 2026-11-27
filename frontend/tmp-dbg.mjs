import fs from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three-stdlib";
globalThis.self = globalThis;
const loader=new GLTFLoader();
const load=(f)=>{const b=fs.readFileSync(f);const ab=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);return new Promise((res,rej)=>loader.parse(ab,"",res,rej));};
const g=await load("public/game-models/characters/cute_cat_in_cute_banana.glb");
const s=g.scene;s.updateWorldMatrix(true,true);
const box=new THREE.Box3().setFromObject(s);const sz=new THREE.Vector3();box.getSize(sz);
console.log("bbox min",box.min.toArray().map(v=>v.toFixed(3)),"max",box.max.toArray().map(v=>v.toFixed(3)));
const v=new THREE.Vector3();
s.traverse(o=>{
  if(!o.isMesh)return;
  const p=o.geometry.attributes.position;
  let mn=Infinity,mx=-Infinity;
  for(let i=0;i<p.count;i+=50){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);mn=Math.min(mn,v.y);mx=Math.max(mx,v.y);}
  console.log(`mesh ${o.name} skinned=${!!o.isSkinnedMesh} localYraw=[${mn.toFixed(2)},${mx.toFixed(2)}] matrixWorld.translation=${o.matrixWorld.elements.slice(12,15).map(x=>x.toFixed(2))}`);
});
// sample head band
let n=0,sum=0,maxZ=-1e9,minZ=1e9;
s.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i+=10){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);if(v.y>=box.min.y+sz.y*0.78){n++;sum+=v.y;maxZ=Math.max(maxZ,v.z);minZ=Math.min(minZ,v.z);}}});
console.log("headN",n,"headAvgY",(sum/n).toFixed(3),"zspan",minZ.toFixed(2),maxZ.toFixed(2));
