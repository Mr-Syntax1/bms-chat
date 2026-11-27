import fs from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three-stdlib";
globalThis.self = globalThis;
const loader=new GLTFLoader();
const load=(f)=>{const b=fs.readFileSync(f);const ab=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);return new Promise((res,rej)=>loader.parse(ab,"",res,rej));};
const g=await load("public/game-models/characters/cute_cat_in_cute_banana.glb");
const s=g.scene;s.updateWorldMatrix(true,true);
const box=new THREE.Box3().setFromObject(s);const sz=new THREE.Vector3();box.getSize(sz);
console.log("bbox min",box.min.toArray().map(v=>v.toFixed(2)),"max",box.max.toArray().map(v=>v.toFixed(2)));
const v=new THREE.Vector3();
s.traverse(o=>{ if(!o.isMesh)return;
  const p=o.geometry.attributes.position;
  let mn=Infinity,mx=-Infinity, mnL=Infinity,mxL=-Infinity;
  for(let i=0;i<p.count;i+=20){ o.getVertexPosition(i,v);
    // v is local? apply matrixWorld to see
    const w=v.clone().applyMatrix4(o.matrixWorld);
    mn=Math.min(mn,w.y);mx=Math.max(mx,w.y);
    mnL=Math.min(mnL,v.y);mxL=Math.max(mxL,v.y);
  }
  console.log(o.name,"getVP raw y",mnL.toFixed(2),mxL.toFixed(2),"| +world y",mn.toFixed(2),mx.toFixed(2));
});
