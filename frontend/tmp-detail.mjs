import fs from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three-stdlib";
globalThis.self = globalThis;
const loader=new GLTFLoader();
const load=(f)=>{const b=fs.readFileSync(f);const ab=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);return new Promise((res,rej)=>loader.parse(ab,"",res,rej));};
const dir="public/game-models/characters/";
for(const name of fs.readdirSync(dir)){
  if(!name.endsWith(".glb"))continue;
  const g=await load(dir+name);const s=g.scene;s.updateWorldMatrix(true,true);
  const box=new THREE.Box3().setFromObject(s);const sz=new THREE.Vector3();box.getSize(sz);const c=new THREE.Vector3();box.getCenter(c);
  const lo=box.min.y+sz.y*0.58, hi=box.min.y+sz.y*0.98;
  // triangle density + normal variance per dominant side, at head band
  const stat={xp:{n:0,var:0},xn:{n:0,var:0},zp:{n:0,var:0},zn:{n:0,var:0}};
  const nrm={xp:[],xn:[],zp:[],zn:[]};
  const nm=new THREE.Matrix3();
  const v=new THREE.Vector3(),n=new THREE.Vector3();
  s.traverse(o=>{ if(!o.isMesh||!o.geometry?.attributes?.position)return;
    const p=o.geometry.attributes.position, na=o.geometry.attributes.normal;
    const idx=o.geometry.index;
    nm.getNormalMatrix(o.matrixWorld);
    const tris=idx?idx.count/3:p.count/3;
    const st=Math.max(1,Math.floor(tris/30000));
    for(let t=0;t<tris;t+=st){
      const i0=idx?idx.getX(t*3):t*3;
      if(o.isSkinnedMesh&&o.getVertexPosition)o.getVertexPosition(i0,v); else v.fromBufferAttribute(p,i0);
      v.applyMatrix4(o.matrixWorld);
      if(v.y<lo||v.y>hi)continue;
      const dx=v.x-c.x, dz=v.z-c.z;
      let k;
      if(Math.abs(dx)>=Math.abs(dz))k=dx>0?"xp":"xn"; else k=dz>0?"zp":"zn";
      stat[k].n++;
      if(na){ n.fromBufferAttribute(na,i0).applyMatrix3(nm).normalize(); nrm[k].push(n.clone()); }
    }});
  function variance(arr){
    if(arr.length<2)return 0;
    const m=new THREE.Vector3();arr.forEach(v=>m.add(v));m.multiplyScalar(1/arr.length);
    let s=0;arr.forEach(v=>s+=v.distanceToSquared(m));
    return s/arr.length;
  }
  const f=x=>x.toFixed(3);
  console.log(name.padEnd(28),
   `tris: +X=${stat.xp.n} -X=${stat.xn.n} +Z=${stat.zp.n} -Z=${stat.zn.n}`);
  console.log("".padEnd(28),
   `normVar: +X=${f(variance(nrm.xp))} -X=${f(variance(nrm.xn))} +Z=${f(variance(nrm.zp))} -Z=${f(variance(nrm.zn))}`);
}
