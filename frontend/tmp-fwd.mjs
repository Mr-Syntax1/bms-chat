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
  const box=new THREE.Box3().setFromObject(s);
  const sz=new THREE.Vector3();box.getSize(sz);
  const c=new THREE.Vector3();box.getCenter(c);
  console.log("\n=== "+name+" size="+sz.toArray().map(v=>v.toFixed(2))+" center="+c.toArray().map(v=>v.toFixed(2)));

  // rig L/R axis
  const bones=[];s.traverse(o=>{if(o.isBone)bones.push(o);});
  const pos=(b)=>{const p=new THREE.Vector3();b.getWorldPosition(p);return p;};
  const find=(re)=>bones.find(b=>re.test(b.name));
  const pairs=[[/(^|_)L(_|$)|left/i,/(^|_)R(_|$)|right/i]];
  for(const b of bones){
    const m=b.name.match(/(.*?)(?:[_.]?)(L|R|left|right)([_.]?\d*)$/i);
  }
  // collect side-suffixed bones
  const lefts=bones.filter(b=>/(_L_|_L\d|^L_|left)/i.test(b.name));
  const rights=bones.filter(b=>/(_R_|_R\d|^R_|right)/i.test(b.name));
  if(lefts.length&&rights.length){
    const avg=(arr)=>{const a=new THREE.Vector3();arr.forEach(b=>a.add(pos(b)));return a.multiplyScalar(1/arr.length);};
    const L=avg(lefts),R=avg(rights);
    const dx=Math.abs(L.x-R.x),dz=Math.abs(L.z-R.z);
    console.log(`  rig L/R: dx=${dx.toFixed(3)} dz=${dz.toFixed(3)} => left-right axis=${dx>dz?'X (faces ±Z)':'Z (faces ±X)'}`);
    console.log(`  L avg=[${L.x.toFixed(2)},${L.y.toFixed(2)},${L.z.toFixed(2)}] R avg=[${R.x.toFixed(2)},${R.y.toFixed(2)},${R.z.toFixed(2)}]`);
    if(dx>dz){ console.log(`  => forward = ${L.x>R.x?'-Z (left=+X => facing -Z)':'+Z (left=-X => facing +Z)'}`); }
    else { console.log(`  => forward = ${L.z>R.z?'+X (left=+Z => facing +X)':'-X (left=-Z => facing -X)'}`); }
  } else console.log("  rig L/R: none");

  // named detail meshes (face/eye/etc)
  s.traverse(o=>{ if(o.isMesh && /face|eye|glow|screen|mouth|horn|nose|muzzle/i.test(o.name+" "+(o.material?.name||""))){ const b=new THREE.Box3().setFromObject(o); const cc=new THREE.Vector3();b.getCenter(cc); console.log(`  detail mesh "${o.name}" mat=${o.material?.name||"-"} center=[${cc.x.toFixed(2)},${cc.y.toFixed(2)},${cc.z.toFixed(2)}]`);} });

  // horizontal slice at eye level: protrusion along ±X and ±Z relative to centroid
  const v=new THREE.Vector3();
  let n=0,sumX=0,sumZ=0,maxX=-1e9,minX=1e9,maxZ=-1e9,minZ=1e9;
  const yLo=box.min.y+sz.y*0.62, yHi=box.min.y+sz.y*0.82;
  s.traverse(o=>{ if(!o.isMesh||!o.geometry?.attributes?.position)return; const p=o.geometry.attributes.position; const st=Math.max(1,Math.floor(p.count/12000)); for(let i=0;i<p.count;i+=st){ v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld); if(v.y>=yLo&&v.y<=yHi){n++;sumX+=v.x;sumZ+=v.z;maxX=Math.max(maxX,v.x);minX=Math.min(minX,v.x);maxZ=Math.max(maxZ,v.z);minZ=Math.min(minZ,v.z);} } });
  if(n){ const cx=sumX/n,cz=sumZ/n; console.log(`  eye-slice n=${n} centroidX=${cx.toFixed(2)} centroidZ=${cz.toFixed(2)} Xspan=[${minX.toFixed(2)},${maxX.toFixed(2)}] Zspan=[${minZ.toFixed(2)},${maxZ.toFixed(2)}]`); console.log(`    asymX=${((maxX-c.x)-(c.x-minX)).toFixed(2)} asymZ=${((maxZ-c.z)-(c.z-minZ)).toFixed(2)}`);}
}
