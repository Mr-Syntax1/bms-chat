import fs from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three-stdlib";
globalThis.self = globalThis;
const loader=new GLTFLoader();
const load=(f)=>{const b=fs.readFileSync(f);const ab=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);return new Promise((res,rej)=>loader.parse(ab,"",res,rej));};
for(const name of fs.readdirSync("public/game-models/characters")){
  if(!name.endsWith(".glb"))continue;
  const g=await load("public/game-models/characters/"+name);const s=g.scene;s.updateWorldMatrix(true,true);
  const approx=new THREE.Box3().setFromObject(s);
  const real=new THREE.Box3();
  const v=new THREE.Vector3();
  s.traverse(o=>{ if(!o.isMesh||!o.geometry?.attributes?.position)return;
    const p=o.geometry.attributes.position;
    for(let i=0;i<p.count;i++){ if(o.isSkinnedMesh&&o.getVertexPosition)o.getVertexPosition(i,v); else v.fromBufferAttribute(p,i);
      v.applyMatrix4(o.matrixWorld); real.expandByPoint(v); }});
  const a=new THREE.Vector3(),r=new THREE.Vector3();approx.getSize(a);real.getSize(r);
  console.log(name.padEnd(28),`approx h=${a.y.toFixed(2)} | REAL h=${r.y.toFixed(2)} w=${r.x.toFixed(2)} d=${r.z.toFixed(2)} minY=${real.min.y.toFixed(3)} center=[${real.getCenter(new THREE.Vector3()).toArray().map(x=>x.toFixed(2))}]`);
}
