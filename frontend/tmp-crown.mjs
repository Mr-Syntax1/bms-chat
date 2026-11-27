import fs from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three-stdlib";
globalThis.self = globalThis;
const loader=new GLTFLoader();
const load=(f)=>{const b=fs.readFileSync(f);const ab=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);return new Promise((res,rej)=>loader.parse(ab,"",res,rej));};
const dir="public/game-models/characters/";
const AXIS={cute_axolotl:"x",cute_cat_in_cute_banana:"z",cute_demon:"z",cute_gugugaga:"x",cute_purple_pony:"z",cute_robot:"x",cute_skull_character:"z"};
for(const name of fs.readdirSync(dir)){
  if(!name.endsWith(".glb"))continue;
  const key=name.replace(".glb","");
  const g=await load(dir+name);const s=g.scene;s.updateWorldMatrix(true,true);
  const box=new THREE.Box3().setFromObject(s);const sz=new THREE.Vector3();box.getSize(sz);
  const pts=[];
  s.traverse(o=>{ if(!o.isMesh||!o.geometry?.attributes?.position)return;
    const p=o.geometry.attributes.position;const st=Math.max(1,Math.floor(p.count/20000));
    for(let i=0;i<p.count;i+=st){const v=new THREE.Vector3();
      if(o.isSkinnedMesh&&o.getVertexPosition)o.getVertexPosition(i,v); else v.fromBufferAttribute(p,i);
      v.applyMatrix4(o.matrixWorld);pts.push(v);}});
  const axis=AXIS[key];
  const lat = axis==="x"?"z":"x"; // lateral is perpendicular to forward
  function band(loFrac,hiFrac){
    const lo=box.min.y+sz.y*loFrac, hi=box.min.y+sz.y*hiFrac;
    const sel=pts.filter(v=>v.y>=lo&&v.y<=hi);
    if(!sel.length)return null;
    const latVals=sel.map(v=>lat==="x"?v.x:v.z).sort((a,b)=>a-b);
    const fwdVals=sel.map(v=>axis==="x"?v.x:v.z).sort((a,b)=>a-b);
    const pct=(arr,q)=>arr[Math.floor((arr.length-1)*q)];
    return {n:sel.length,
      latP5:pct(latVals,0.05),latP95:pct(latVals,0.95),
      latSpan:pct(latVals,0.95)-pct(latVals,0.05),
      fwdP5:pct(fwdVals,0.05),fwdP95:pct(fwdVals,0.95),
      fwdSpan:pct(fwdVals,0.95)-pct(fwdVals,0.05)};
  }
  const crown=band(0.94,1.0), eye=band(0.68,0.80), face=band(0.62,0.86);
  const f=(x)=>x===null?"-":x.toFixed(2);
  console.log(key.padEnd(26),`axis=${axis}`);
  console.log("  crown(top6%):",crown?`latSpan=${f(crown.latSpan)} fwdSpan=${f(crown.fwdSpan)} n=${crown.n}`:"-");
  console.log("  eye(68-80%):",eye?`latSpan=${f(eye.latSpan)} fwdSpan=${f(eye.fwdSpan)} lat[${f(eye.latP5)},${f(eye.latP95)}] fwd[${f(eye.fwdP5)},${f(eye.fwdP95)}]`:"-");
  console.log("  face(62-86%):",face?`latSpan=${f(face.latSpan)} fwdSpan=${f(face.fwdSpan)}`:"-");
}
