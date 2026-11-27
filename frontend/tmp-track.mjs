import fs from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three-stdlib";
globalThis.self = globalThis;
const loader=new GLTFLoader();
const load=(f)=>{const b=fs.readFileSync(f);const ab=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);return new Promise((res,rej)=>loader.parse(ab,"",res,rej));};
for(const nm of ["cute_cat_in_cute_banana.glb","cute_robot.glb"]){
  const g=await load("public/game-models/characters/"+nm);
  console.log("\n=== "+nm);
  for(const clip of g.animations){
    console.log(`clip "${clip.name}" dur=${clip.duration.toFixed(2)}`);
    for(const t of clip.tracks){
      const v=t.values;let mn=Infinity,mx=-Infinity;
      for(let i=0;i<v.length;i++){mn=Math.min(mn,v[i]);mx=Math.max(mx,v[i]);}
      const rng=mx-mn;
      if(rng>1e-4)console.log(`   ${t.name} range=${rng.toFixed(4)}`);
    }
  }
}
