import fs from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three-stdlib";
globalThis.self = globalThis;
const loader = new GLTFLoader();
const load=(f)=>{const b=fs.readFileSync(f);const ab=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);return new Promise((res,rej)=>loader.parse(ab,"",res,rej));};
const dir="public/game-models/characters/";
const nm=new THREE.Matrix3();
for(const name of fs.readdirSync(dir)){
  if(!name.endsWith(".glb"))continue;
  const g=await load(dir+name);const s=g.scene;s.updateWorldMatrix(true,true);
  const box=new THREE.Box3().setFromObject(s);const sz=new THREE.Vector3();box.getSize(sz);const c=new THREE.Vector3();box.getCenter(c);
  // concavity per side: sampled vertices at head band, normal vs radial
  const acc={xp:0,xn:0,zp:0,zn:0};
  const v=new THREE.Vector3(),n=new THREE.Vector3(),rad=new THREE.Vector3();
  s.traverse(o=>{ if(!o.isMesh||!o.geometry?.attributes?.position||!o.geometry.attributes.normal)return;
    const p=o.geometry.attributes.position, na=o.geometry.attributes.normal;
    nm.getNormalMatrix(o.matrixWorld);
    const st=Math.max(1,Math.floor(p.count/20000));
    for(let i=0;i<p.count;i+=st){
      v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);
      if(v.y<box.min.y+sz.y*0.55||v.y>box.min.y+sz.y*0.95)continue;
      n.fromBufferAttribute(na,i).applyMatrix3(nm).normalize();
      rad.set(v.x-c.x,0,v.z-c.z); if(rad.lengthSq()<1e-8)continue; rad.normalize();
      const conc=-n.dot(rad); // >0 concave
      if(conc<=0)continue;
      // assign to dominant axis
      if(Math.abs(v.x-c.x)>=Math.abs(v.z-c.z)){ if(v.x>c.x)acc.xp+=conc; else acc.xn+=conc; }
      else { if(v.z>c.z)acc.zp+=conc; else acc.zn+=conc; }
    }});
  const f=(x)=>x.toFixed(2);
  console.log(name.padEnd(28), `xp=${f(acc.xp)} xn=${f(acc.xn)} zp=${f(acc.zp)} zn=${f(acc.zn)}`);
}
