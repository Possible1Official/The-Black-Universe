import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {biomeDetail,groundMapData,groundBlend,groundTint,createGroundMaterial,GROUND_MAP_SIZE} from '../src/terrain-material';
import {SurfaceContact} from '../src/surface-contact';

test('packed biome fields are deterministic, seamless and distinct, including negative UVs',()=>{
  assert.deepEqual(groundMapData(16),groundMapData(16));
  for(const [u,v] of [[0,0],[.13,.78],[-.24,.35],[1,-1]]){
    const h=biomeDetail(u,v);assert.ok(h.every(v=>v>=0&&v<=1));
    h.forEach((n,i)=>assert.ok(Math.abs(n-biomeDetail(u+1,v-2)[i])<1e-12));
  }
  const data=groundMapData();assert.equal(data.packed.byteLength,GROUND_MAP_SIZE**2*4);
  const channels=[new Set(),new Set(),new Set()];let sandStone=0,stoneSoil=0;
  for(let i=0;i<data.packed.length;i+=4){
    assert.equal(data.packed[i+3],255);channels.forEach((c,j)=>c.add(data.packed[i+j]));
    sandStone+=Math.abs(data.packed[i]-data.packed[i+1]);stoneSoil+=Math.abs(data.packed[i+1]-data.packed[i+2]);
  }
  assert.ok(channels.every(c=>c.size>80));assert.ok(sandStone/(GROUND_MAP_SIZE**2)>25);assert.ok(stoneSoil/(GROUND_MAP_SIZE**2)>25);
});
test('regional blending stays normalized and continuous, with stone exposed on slopes',()=>{
  assert.deepEqual(groundBlend(0,0,1),[1,0,0]);assert.deepEqual(groundBlend(-40,-40,1),[0,1,0]);
  assert.deepEqual(groundBlend(40,40,1),[0,0,1]);assert.deepEqual(groundBlend(40,-40,1),[.2,.8,0]);
  for(let x=-128;x<=128;x+=2)for(let z=-128;z<=128;z+=2){
    for(const slope of [1,.95,.5]){const w=groundBlend(x,z,slope);assert.ok(w.every(v=>v>=0&&v<=1));assert.ok(Math.abs(w.reduce((a,b)=>a+b)-1)<1e-12);}
    const a=groundBlend(x,z,1),b=groundBlend(x+.001,z,1);assert.ok(a.every((v,i)=>Math.abs(v-b[i])<.001));
    assert.deepEqual(groundBlend(x,z,.5),[0,1,0]);
  }
});
test('tint remains finite linear color and distinguishes rocky and lowland regions',()=>{
  const low=groundTint(-1,1),high=groundTint(1,1),steep=groundTint(1,.5);
  assert.notEqual(low.getHex(),high.getHex());assert.notEqual(steep.getHex(),high.getHex());
  for(const color of [low,high,steep,groundTint(-100,-1),groundTint(100,2)])assert.ok([color.r,color.g,color.b].every(c=>Number.isFinite(c)&&c>=0&&c<=1));
});
test('quality reuses one linear packed resource and biome shader composes with surface contacts',()=>{
  const ground=createGroundMaterial(),m=ground.material,packed=m.map;
  assert.equal(packed?.colorSpace,THREE.NoColorSpace);assert.equal(m.bumpMap,packed);assert.equal(m.roughnessMap,packed);
  assert.equal(packed?.wrapS,THREE.RepeatWrapping);assert.equal(packed?.generateMipmaps,true);
  ground.setQuality(false);assert.equal(m.map,packed);assert.equal(m.bumpMap,null);assert.equal(m.roughnessMap,null);
  const version=m.version;ground.setQuality(false);assert.equal(m.version,version);
  ground.setQuality(true);assert.equal(m.bumpMap,packed);assert.equal(m.roughnessMap,packed);assert.equal(m.map,packed);
  assert.equal(ground.snapshot().cpuBytes,65536);
  const contact=new SurfaceContact();contact.bind(m);
  const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
  m.onBeforeCompile(shader as any,null as any);
  assert.ok(shader.vertexShader.includes('vGroundBlend = groundBlend'));assert.ok(shader.vertexShader.includes('vContactXZ ='));
  assert.ok(shader.fragmentShader.includes('dFdx(groundHeight)'));assert.ok(shader.fragmentShader.includes('outgoingLight *= contactVisibility'));
  assert.ok(!shader.fragmentShader.includes('#include <map_fragment>'));assert.ok(m.customProgramCacheKey().includes('surface-contact-v2'));
  packed?.dispose();m.dispose();
});
