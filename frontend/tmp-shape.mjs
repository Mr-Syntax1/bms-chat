import fs from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three-stdlib";
globalThis.self = globalThis;
const loader=new GLTFLoader();
const load=(f)=>{const b=fs.readFileSync(f);const ab=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);return new Promise((res,rej)=>loader.parse(ab,"",res,rej));};
for(const nm of ["cute_demon.glb","cute_skull_character.glb","cute_robot.glb"]){
  const g=await load("public/game-models/characters/"+nm);
  const s=g.scene;s.updateWorldMatrix(true,true);
  const box=new THREE.Box3().setFromObject(s);const sz=new THREE.Vector3();box.getSize(sz);
  const v=new THREE.Vector3();
  const slabs=10; const lat = nm.includes("robot")?"z":null;
  const hist=Array.from({length:slabs},()=>({n:0,minX:1e9,maxX:-1e9,minZ:1e9,maxZ:-1e9}));
  s.traverse(o=>{ if(!o.isMesh||!o.geometry?.attributes?.position)return;const p=o.geometry.attributes.position;
    const st=Math.max(1,Math.floor(p.count/30000));
    for(let i=0;i<p.count;i+=st){ if(o.isSkinnedMesh&&o.getVertexPosition)o.getVertexPosition(i,v); else v.fromBufferAttribute(p,i);
      v.applyMatrix4(o.matrixWorld);
      const k=Math.min(slabs-1,Math.max(0,Math.floor((v.y-box.min.y)/sz.y*slabs)));
      const h=hist[k];h.n++;h.minX=Math.min(h.minX,v.x);h.maxX=Math.max(h.maxX,v.x);h.minZ=Math.min(h.minZ,v.z);h.maxZ=Math.max(h.maxZ,v.z);}});
  console.log("\n=== "+nm+" H="+sz.y.toFixed(2)+" W="+sz.x.toFixed(2)+" D="+sz.z.toFixed(2));
  hist.forEach((h,i)=>{
    const yFrac=((i+0.5)/slabs).toFixed(2);
    const w=(h.maxX-h.minX), d=(h.maxZ-h.minZ);
    console.log(`  y%${yFrac} n=${String(h.n).padStart(5)} width=${w.toFixed(2)} depth=${d.toFixed(2)} cx=${((h.minX+h.maxX)/2).toFixed(2)} cz=${((h.minZ+h.maxZ)/2).toFixed(2)}`);
  });
}
