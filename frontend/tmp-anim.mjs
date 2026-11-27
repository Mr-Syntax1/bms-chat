import fs from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three-stdlib";
globalThis.self = globalThis;
const loader=new GLTFLoader();
const load=(f)=>{const b=fs.readFileSync(f);const ab=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);return new Promise((res,rej)=>loader.parse(ab,"",res,rej));};
const g=await load("public/game-models/characters/cute_cat_in_cute_banana.glb");
const s=g.scene;s.updateWorldMatrix(true,true);
const mixer=new THREE.AnimationMixer(s);
const clip=g.animations[0];
const action=mixer.clipAction(clip);action.play();
console.log("clip",clip.name,"dur",clip.duration.toFixed(2));
const v=new THREE.Vector3();
for(let t=0;t<=clip.duration+0.01;t+=clip.duration/8){
  mixer.setTime(t);
  s.updateWorldMatrix(true,true);
  const box=new THREE.Box3();
  let n=0;
  s.traverse(o=>{ if(!o.isMesh||!o.geometry?.attributes?.position)return;
    const p=o.geometry.attributes.position;const st=Math.max(1,Math.floor(p.count/3000));
    for(let i=0;i<p.count;i+=st){ o.getVertexPosition(i,v); v.applyMatrix4(o.matrixWorld); box.expandByPoint(v); n++; }});
  const sz=new THREE.Vector3();box.getSize(sz);
  console.log(`t=${t.toFixed(2)} bbox y=[${box.min.y.toFixed(2)},${box.max.y.toFixed(2)}] x=[${box.min.x.toFixed(2)},${box.max.x.toFixed(2)}] z=[${box.min.z.toFixed(2)},${box.max.z.toFixed(2)}]`);
}
