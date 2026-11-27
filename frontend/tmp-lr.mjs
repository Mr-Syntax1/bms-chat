import fs from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three-stdlib";
globalThis.self = globalThis;
const loader=new GLTFLoader();
const load=(f)=>{const b=fs.readFileSync(f);const ab=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);return new Promise((res,rej)=>loader.parse(ab,"",res,rej));};
const LEFT=/(^|[_.\s])L([_.\s]|$|\d)|(^|[_.\s])left([_.\s]|$|\d)|(_|^)L\d|(_|^)left/i;
const RIGHT=/(^|[_.\s])R([_.\s]|$|\d)|(^|[_.\s])right([_.\s]|$|\d)|(_|^)R\d|(_|^)right/i;
for(const nm of ["cute_cat_in_cute_banana.glb","cute_gugugaga.glb"]){
  const g=await load("public/game-models/characters/"+nm);
  console.log("\n=== "+nm);
  const bones=[];g.scene.traverse(o=>{if(o.isBone)bones.push(o);});
  for(const b of bones){const L=LEFT.test(b.name),R=RIGHT.test(b.name);if(L||R)console.log(`  ${b.name}  L=${L} R=${R}`);}
}
