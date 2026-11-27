import fs from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three-stdlib";
globalThis.self = globalThis;
const loader = new GLTFLoader();
const load=(f)=>{const b=fs.readFileSync(f);const ab=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);return new Promise((res,rej)=>loader.parse(ab,"",res,rej));};
const dir="public/game-models/characters/";
const G=72;

function silhouette(scene,axis,sign){
  const box=new THREE.Box3().setFromObject(scene);const sz=new THREE.Vector3();box.getSize(sz);
  // project onto plane perpendicular to axis
  const u = axis==="z" ? "x" : "z";
  const spanU = u==="x"?sz.x:sz.z, spanY=sz.y;
  const grid=new Uint8Array(G*G);
  const v=new THREE.Vector3();
  const minU = u==="x"?box.min.x:box.min.z;
  scene.traverse(o=>{ if(!o.isMesh||!o.geometry?.attributes?.position)return;
    const p=o.geometry.attributes.position; const st=Math.max(1,Math.floor(p.count/30000));
    for(let i=0;i<p.count;i+=st){ v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);
      const gu=Math.floor(((u==="x"?v.x:v.z)-minU)/spanU*(G-1));
      const gy=Math.floor((v.y-box.min.y)/spanY*(G-1));
      if(gu<0||gu>=G||gy<0||gy>=G)continue; grid[gy*G+gu]=1; }});
  return grid;
}
function symmetry(grid){
  let inter=0,uni=0;
  for(let y=0;y<G;y++)for(let x=0;x<G;x++){const a=grid[y*G+x],b=grid[y*G+(G-1-x)];if(a||b)uni++;if(a&&b)inter++;}
  return uni?inter/uni:0;
}
for(const name of fs.readdirSync(dir)){
  if(!name.endsWith(".glb"))continue;
  const g=await load(dir+name);const s=g.scene;s.updateWorldMatrix(true,true);
  const sz=new THREE.Vector3();new THREE.Box3().setFromObject(s).getSize(sz);
  const sy=symmetry(silhouette(s,"z",1));
  const sx=symmetry(silhouette(s,"x",1));
  console.log(name.padEnd(28),`sym(front-view along Z)=${sy.toFixed(3)}  sym(side-view along X)=${sx.toFixed(3)}  => front-back axis = ${sy>=sx?"Z":"X"}`);
}
