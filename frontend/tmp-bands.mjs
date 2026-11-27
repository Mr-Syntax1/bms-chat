import fs from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three-stdlib";
globalThis.self = globalThis;
const loader=new GLTFLoader();
const load=(f)=>{const b=fs.readFileSync(f);const ab=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);return new Promise((res,rej)=>loader.parse(ab,"",res,rej));};
const AXIS={cute_axolotl:"x",cute_cat_in_cute_banana:"z",cute_demon:"z",cute_gugugaga:"x",cute_purple_pony:"z",cute_robot:"x",cute_skull_character:"z"};
for(const name of fs.readdirSync("public/game-models/characters")){
  if(!name.endsWith(".glb"))continue;
  const key=name.replace(".glb","");
  const g=await load("public/game-models/characters/"+name);const s=g.scene;s.updateWorldMatrix(true,true);
  const box=new THREE.Box3().setFromObject(s);const sz=new THREE.Vector3();box.getSize(sz);
  const axis=AXIS[key];
  const v=new THREE.Vector3();
  const slabs=16;
  const hist=Array.from({length:slabs},()=>({n:0,minL:1e9,maxL:-1e9,minF:1e9,maxF:-1e9}));
  s.traverse(o=>{ if(!o.isMesh||!o.geometry?.attributes?.position)return;const p=o.geometry.attributes.position;
    const st=Math.max(1,Math.floor(p.count/30000));
    for(let i=0;i<p.count;i+=st){ if(o.isSkinnedMesh&&o.getVertexPosition)o.getVertexPosition(i,v); else v.fromBufferAttribute(p,i);
      v.applyMatrix4(o.matrixWorld);
      const k=Math.min(slabs-1,Math.max(0,Math.floor((v.y-box.min.y)/sz.y*slabs)));
      const h=hist[k];h.n++;
      const L=axis==="x"?v.z:v.x, F=axis==="x"?v.x:v.z;
      h.minL=Math.min(h.minL,L);h.maxL=Math.max(h.maxL,L);
      h.minF=Math.min(h.minF,F);h.maxF=Math.max(h.maxF,F);}});
  console.log("\n=== "+key+"  axis="+axis+"  H="+sz.y.toFixed(2)+" (raw Y "+box.min.y.toFixed(2)+".."+box.max.y.toFixed(2)+")");
  hist.forEach((h,i)=>{
    if(!h.n){console.log(`  y%${((i+0.5)/slabs).toFixed(2)} EMPTY`);return;}
    console.log(`  y%${((i+0.5)/slabs).toFixed(2)} n=${String(h.n).padStart(5)} lat=${(h.maxL-h.minL).toFixed(2)} fwd=${(h.maxF-h.minF).toFixed(2)} fac=${((h.minF+h.maxF)/2).toFixed(2)}`);
  });
}
