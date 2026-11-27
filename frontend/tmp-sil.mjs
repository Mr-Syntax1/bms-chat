import fs from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three-stdlib";
globalThis.self = globalThis;
const loader = new GLTFLoader();
const load=(f)=>{const b=fs.readFileSync(f);const ab=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);return new Promise((res,rej)=>loader.parse(ab,"",res,rej));};
const GX=64,GY=30;
function sil(scene,axis){
  const box=new THREE.Box3().setFromObject(scene);const sz=new THREE.Vector3();box.getSize(sz);
  const u = axis==="z"?"x":"z";
  const spanU=u==="x"?sz.x:sz.z, spanY=sz.y;
  const minU=u==="x"?box.min.x:box.min.z;
  const g=new Uint8Array(GX*GY);const v=new THREE.Vector3();
  scene.traverse(o=>{ if(!o.isMesh||!o.geometry?.attributes?.position)return;
    const p=o.geometry.attributes.position;
    for(let i=0;i<p.count;i++){ v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);
      const gu=Math.round(((u==="x"?v.x:v.z)-minU)/spanU*(GX-1));
      const gy=Math.round((v.y-box.min.y)/spanY*(GY-1));
      if(gu<0||gu>=GX||gy<0||gy>=GY)continue; g[gy*GX+gu]=1; }});
  const rows=[];
  for(let y=GY-1;y>=0;y--){let line="";for(let x=0;x<GX;x++)line+=g[y*GX+x]?"#":".";rows.push(line);}
  return rows;
}
const name=process.argv[2];
const g=await load("public/game-models/characters/"+name);
const s=g.scene;s.updateWorldMatrix(true,true);
const box=new THREE.Box3().setFromObject(s);const sz=new THREE.Vector3();box.getSize(sz);
console.log(`=== ${name}  w(x)=${sz.x.toFixed(2)} h(y)=${sz.y.toFixed(2)} d(z)=${sz.z.toFixed(2)}`);
console.log(`\n[view along -Z : looking at the +Z face]  (left of image = -X)`);
sil(s,"z").forEach(r=>console.log(r));
console.log(`\n[view along -X : looking at the +X face]  (left of image = +Z ... )`);
sil(s,"x").forEach(r=>console.log(r));
