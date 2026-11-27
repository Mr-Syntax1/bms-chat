import fs from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three-stdlib";
globalThis.self = globalThis;
const loader = new GLTFLoader();
const load=(f)=>{const b=fs.readFileSync(f);const ab=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);return new Promise((res,rej)=>loader.parse(ab,"",res,rej));};
const dir="public/game-models/characters/";
for(const name of fs.readdirSync(dir)){
  if(!name.endsWith(".glb"))continue;
  const g=await load(dir+name);const s=g.scene;s.updateWorldMatrix(true,true);
  const box=new THREE.Box3().setFromObject(s);const sz=new THREE.Vector3();box.getSize(sz);const c=new THREE.Vector3();box.getCenter(c);
  console.log("\n=== "+name);

  // 1) boundary edges (eye sockets / mouth cavities) at head level
  let bSumX=0,bSumZ=0,bN=0;
  const headLo=box.min.y+sz.y*0.55;
  s.traverse(o=>{
    if(!o.isMesh||!o.geometry)return;
    const geo=o.geometry, pos=geo.attributes.position, idx=geo.index;
    if(!pos)return;
    const key=(a,b)=>a<b?a+"_"+b:b+"_"+a;
    const map=new Map();
    const vA=new THREE.Vector3(),vB=new THREE.Vector3();
    const get=(i)=>{const p=new THREE.Vector3().fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld);return p;};
    const tris=idx?idx.count/3:pos.count/3;
    const step=Math.max(1,Math.floor(tris/60000));
    for(let t=0;t<tris;t+=step){
      const i0=idx?idx.getX(t*3):t*3,i1=idx?idx.getX(t*3+1):t*3+1,i2=idx?idx.getX(t*3+2):t*3+2;
      for(const [a,b] of [[i0,i1],[i1,i2],[i2,i0]]){const k=key(a,b);map.set(k,(map.get(k)||0)+1);}
    }
    // boundary edges = count 1 (approx; step sampling may distort). Use full pass if no step.
    if(step===1){
      for(const [k,cnt] of map){ if(cnt!==1)continue; const [a,b]=k.split("_").map(Number);
        const pa=get(a),pb=get(b); const my=(pa.y+pb.y)/2;
        if(my>=headLo){ bSumX+=(pa.x+pb.x)/2; bSumZ+=(pa.z+pb.z)/2; bN++; }
      }
    }
  });
  if(bN) console.log(`  boundary(eye/mouth) edges at head: n=${bN} avgX=${(bSumX/bN).toFixed(2)} avgZ=${(bSumZ/bN).toFixed(2)} center=[${c.x.toFixed(2)},${c.z.toFixed(2)}]`);

  // 2) concavity along axes at head: for each horizontal ray from outside, distance to first hit
  //    face side = side with MORE concave detail (larger spread of hit distances)
  const v=new THREE.Vector3();
  function spread(dirSign,axis){
    const dists=[];
    const N=24;
    for(let i=0;i<N;i++){
      const a=(i/N)*Math.PI*2;
      const ox=Math.cos(a)*sz.x*0.6, oz=Math.sin(a)*sz.z*0.6;
      let best=Infinity;
      s.traverse(o=>{ if(!o.isMesh||!o.geometry?.attributes?.position)return;
        const p=o.geometry.attributes.position; const st=Math.max(1,Math.floor(p.count/6000));
        for(let j=0;j<p.count;j+=st){ v.fromBufferAttribute(p,j).applyMatrix4(o.matrixWorld);
          if(v.y<box.min.y+sz.y*0.6||v.y>box.min.y+sz.y*0.9)continue;
          if(axis==="z"){ const d=(dirSign>0? v.z-box.max.z : box.min.z-v.z); const lateral=Math.abs(v.x-(c.x+ox*0.4)); if(lateral<sz.x*0.15){best=Math.min(best,Math.abs(v.z-(dirSign>0?box.max.z:box.min.z)));} }
          if(axis==="x"){ const lateral=Math.abs(v.z-(c.z+oz*0.4)); if(lateral<sz.z*0.15){best=Math.min(best,Math.abs(v.x-(dirSign>0?box.max.x:box.min.x)));} }
        }});
      if(best<Infinity)dists.push(best);
    }
    if(!dists.length)return 0;
    const mean=dists.reduce((a,b)=>a+b,0)/dists.length;
    const varr=dists.reduce((a,b)=>a+(b-mean)**2,0)/dists.length;
    return varr;
  }
  const varZp=spread(1,"z"), varZn=spread(-1,"z"), varXp=spread(1,"x"), varXn=spread(-1,"x");
  console.log(`  concavity var: +Z=${varZp.toFixed(4)} -Z=${varZn.toFixed(4)} +X=${varXp.toFixed(4)} -X=${varXn.toFixed(4)}`);
}
