import fs from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three-stdlib";
globalThis.self = globalThis;
const loader=new GLTFLoader();
const load=(f)=>{const b=fs.readFileSync(f);const ab=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);return new Promise((res,rej)=>loader.parse(ab,"",res,rej));};
function grid(scene,axis,W){
  const box=new THREE.Box3().setFromObject(scene);const sz=new THREE.Vector3();box.getSize(sz);
  const u = axis==="z"?"x":"z";
  const spanU=u==="x"?sz.x:sz.z;
  const H=Math.max(6,Math.round(W*sz.y/spanU*0.5)); // 0.5 = char aspect
  const g=new Uint8Array(W*H);const v=new THREE.Vector3();
  scene.traverse(o=>{ if(!o.isMesh||!o.geometry?.attributes?.position)return;
    const p=o.geometry.attributes.position;
    for(let i=0;i<p.count;i++){ if(o.isSkinnedMesh&&o.getVertexPosition)o.getVertexPosition(i,v); else v.fromBufferAttribute(p,i);
      v.applyMatrix4(o.matrixWorld);
      const minU=u==="x"?box.min.x:box.min.z;
      const gu=Math.round(((u==="x"?v.x:v.z)-minU)/spanU*(W-1));
      const gy=Math.round((v.y-box.min.y)/sz.y*(H-1));
      if(gu<0||gu>=W||gy<0||gy>=H)continue; g[gy*W+gu]=1; }});
  const rows=[];for(let y=H-1;y>=0;y--){let l="";for(let x=0;x<W;x++)l+=g[y*W+x]?"#":".";rows.push(l);}
  return {rows,W,H};
}
const name=process.argv[2];
const g=await load("public/game-models/characters/"+name);
const s=g.scene;s.updateWorldMatrix(true,true);
const box=new THREE.Box3().setFromObject(s);const sz=new THREE.Vector3();box.getSize(sz);
console.log(`=== ${name}  x=${sz.x.toFixed(2)} y=${sz.y.toFixed(2)} z=${sz.z.toFixed(2)}`);
const W=46;
const A=grid(s,"z",W), B=grid(s,"x",W);
console.log("\nFRONT/BACK view  (image-left = -X, looking toward -Z; so +Z is toward viewer)");
A.rows.forEach(r=>console.log(r));
console.log("\nSIDE view        (image-left = -Z ... looking toward +X)");
B.rows.forEach(r=>console.log(r));
