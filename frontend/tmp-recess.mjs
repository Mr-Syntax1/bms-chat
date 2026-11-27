import fs from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three-stdlib";
globalThis.self = globalThis;
const loader=new GLTFLoader();
const load=(f)=>{const b=fs.readFileSync(f);const ab=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);return new Promise((res,rej)=>loader.parse(ab,"",res,rej));};
const dir="public/game-models/characters/";
function verts(scene,max){
  const out=[];
  scene.traverse(o=>{ if(!o.isMesh||!o.geometry?.attributes?.position)return;
    const p=o.geometry.attributes.position; const st=Math.max(1,Math.floor(p.count/max));
    for(let i=0;i<p.count;i+=st){const v=new THREE.Vector3();
      if(o.isSkinnedMesh&&o.getVertexPosition)o.getVertexPosition(i,v); else v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);
      out.push(v);}});
  return out;
}
for(const name of fs.readdirSync(dir)){
  if(!name.endsWith(".glb"))continue;
  const g=await load(dir+name);const s=g.scene;s.updateWorldMatrix(true,true);
  const box=new THREE.Box3().setFromObject(s);const sz=new THREE.Vector3();box.getSize(sz);
  const all=verts(s,40000);
  // head band
  const lo=box.min.y+sz.y*0.6, hi=box.min.y+sz.y*0.98;
  const head=all.filter(v=>v.y>=lo&&v.y<=hi);
  // recessed fraction per side: for axis, depth from extreme, count verts >15% of span behind front
  function recess(sign,axis){
    const span = axis==="z"?sz.z:sz.x;
    const extreme = axis==="z" ? (sign>0?box.max.z:box.min.z) : (sign>0?box.max.x:box.min.x);
    const depth = head.map(v=>{
      const c = axis==="z"?v.z:v.x;
      return Math.abs(c-extreme);
    });
    const thresh = span*0.18;
    // only consider verts whose lateral offset is small (center of face) - skip, use all
    return depth.filter(d=>d>thresh && d<span*0.9).length/Math.max(1,depth.length);
  }
  // also: center-column recess (eyes/mouth are near the middle laterally)
  function centerRecess(sign,axis){
    const span = axis==="z"?sz.z:sz.x;
    const lat = axis==="z"?"x":"z";
    const latSpan = lat==="x"?sz.x:sz.z;
    const latMid = lat==="x"?(box.min.x+box.max.x)/2:(box.min.z+box.max.z)/2;
    const extreme = axis==="z" ? (sign>0?box.max.z:box.min.z) : (sign>0?box.max.x:box.min.x);
    let n=0,recessed=0;
    for(const v of head){
      const lv = lat==="x"?v.x:v.z;
      if(Math.abs(lv-latMid)>latSpan*0.30)continue;
      const c = axis==="z"?v.z:v.x;
      const d=Math.abs(c-extreme);
      n++; if(d>span*0.12&&d<span*0.85)recessed++;
    }
    return n?recessed/n:0;
  }
  const f=(x)=>x.toFixed(3);
  console.log(name.padEnd(28),
    `recess: +X=${f(recess(1,"x"))} -X=${f(recess(-1,"x"))} +Z=${f(recess(1,"z"))} -Z=${f(recess(-1,"z"))}`);
  console.log("".padEnd(28),
    `center: +X=${f(centerRecess(1,"x"))} -X=${f(centerRecess(-1,"x"))} +Z=${f(centerRecess(1,"z"))} -Z=${f(centerRecess(-1,"z"))}`);
}
