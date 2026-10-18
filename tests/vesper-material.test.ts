import {test} from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {vesperBlend,vesperTint,vesperDetail,createVesperMaterial} from '../src/vesper-material';
import {SurfaceContact} from '../src/surface-contact';
test('Vesper frost shelf and fissure have distinct, normalized continuous surfaces with exposed slopes',()=>{
 assert.ok(vesperBlend(-23,2,1)[0]>.9);assert.ok(vesperBlend(20,-18,1)[2]>.8);
 assert.equal(vesperBlend(-23,2,.6)[0],0);
 for(let x=-48;x<=48;x+=2)for(let z=-48;z<=48;z+=2){
  const a=vesperBlend(x,z,.98),b=vesperBlend(x+.001,z,.98);
  assert.ok(a.every(v=>v>=0&&v<=1));assert.ok(Math.abs(a.reduce((s,v)=>s+v,0)-1)<1e-12);
  assert.ok(a.every((v,i)=>Math.abs(v-b[i])<.001));const c=vesperTint(a);assert.ok([c.r,c.g,c.b].every(v=>Number.isFinite(v)&&v>=0&&v<=1));
 }
 assert.notEqual(vesperTint(vesperBlend(-23,2,1)).getHex(),vesperTint(vesperBlend(20,-18,1)).getHex());
});
test('periodic packed ice, basalt and mineral detail remains bounded across tile seams',()=>{
 for(const [u,v] of [[0,0],[.12,.83],[-.24,.37],[1,-1]]){const a=vesperDetail(u,v),b=vesperDetail(u+1,v-2);assert.ok(a.every(v=>v>=0&&v<=1));a.forEach((n,i)=>assert.ok(Math.abs(n-b[i])<1e-12));}
 const sums=[0,0];for(let y=0;y<32;y++)for(let x=0;x<32;x++){const d=vesperDetail(x/32,y/32);sums[0]+=Math.abs(d[0]-d[1]);sums[1]+=Math.abs(d[1]-d[2]);}assert.ok(sums.every(v=>v/1024>.05));
});
test('Vesper quality switches reuse one scalar map and compose with ground contacts',()=>{
 const g=createVesperMaterial(),m=g.material,map=m.map!;assert.equal(map.colorSpace,THREE.NoColorSpace);assert.equal(g.snapshot().cpuBytes,65536);
 g.setQuality(false);assert.equal(m.map,map);assert.equal(m.bumpMap,null);assert.equal(m.roughnessMap,null);const version=m.version;g.setQuality(false);assert.equal(m.version,version);
 g.setQuality(true);assert.equal(m.bumpMap,map);assert.equal(m.roughnessMap,map);new SurfaceContact().bind(m);
 const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};m.onBeforeCompile(shader as any,null as any);
 assert.ok(shader.vertexShader.includes('vVesperBlend = vesperBlend'));assert.ok(shader.fragmentShader.includes('dFdx(vesperHeight)'));assert.ok(shader.fragmentShader.includes('outgoingLight *= contactVisibility'));assert.ok(!shader.fragmentShader.includes('#include <map_fragment>'));map.dispose();m.dispose();
});
