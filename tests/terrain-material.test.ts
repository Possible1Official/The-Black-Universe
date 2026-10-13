import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {groundDetail,groundMapData,groundTint,createGroundMaterial,GROUND_MAP_SIZE} from '../src/terrain-material';

test('ground detail is deterministic and periodic, including negative world coordinates',()=>{
  assert.deepEqual(groundMapData(16),groundMapData(16));
  for(const [u,v] of [[0,0],[.13,.78],[-.24,.35],[1,-1]]){
    const h=groundDetail(u,v);assert.ok(h>=0&&h<=1);
    assert.ok(Math.abs(h-groundDetail(u+1,v-2))<1e-12);
  }
});
test('material data is opaque, bounded, rough and encodes normalized upward tangent normals',()=>{
  const data=groundMapData();assert.equal(data.albedo.byteLength+data.normal.byteLength+data.roughness.byteLength,3*GROUND_MAP_SIZE**2*4);
  for(let i=0;i<data.normal.length;i+=4){
    assert.equal(data.albedo[i+3],255);assert.equal(data.normal[i+3],255);assert.equal(data.roughness[i+3],255);
    const n=Array.from(data.normal.slice(i,i+3)).map(c=>c/255*2-1);
    assert.ok(Math.abs(Math.hypot(...n)-1)<.015);assert.ok(n[2]>.8);
    assert.ok(data.roughness[i+1]>=232&&data.roughness[i+1]<=254);
  }
  assert.ok(new Set(data.albedo).size>20,'fine detail has actual tonal variation');
});
test('slope and lowland tint remain finite linear colors and distinguish rock from soil',()=>{
  const low=groundTint(-1,1),high=groundTint(1,1),steep=groundTint(1,.5);
  assert.notEqual(low.getHex(),high.getHex());assert.notEqual(steep.getHex(),high.getHex());
  for(const color of [low,high,steep,groundTint(-100,-1),groundTint(100,2)])assert.ok([color.r,color.g,color.b].every(c=>Number.isFinite(c)&&c>=0&&c<=1));
});
test('quality changes retain textures and color-space semantics without recreating resources',()=>{
  const ground=createGroundMaterial(),m=ground.material,albedo=m.map,normal=m.normalMap,roughness=m.roughnessMap;
  assert.equal(albedo?.colorSpace,THREE.SRGBColorSpace);assert.equal(normal?.colorSpace,THREE.NoColorSpace);assert.equal(roughness?.colorSpace,THREE.NoColorSpace);
  assert.equal(albedo?.wrapS,THREE.RepeatWrapping);assert.equal(albedo?.generateMipmaps,true);
  ground.setQuality(false);assert.equal(m.map,albedo);assert.equal(m.normalMap,null);assert.equal(m.roughnessMap,null);
  const version=m.version;ground.setQuality(false);assert.equal(m.version,version);
  ground.setQuality(true);assert.equal(m.normalMap,normal);assert.equal(m.roughnessMap,roughness);assert.equal(m.map,albedo);
  assert.equal(ground.snapshot().cpuBytes,196608);
  for(const t of [albedo,normal,roughness])t?.dispose();m.dispose();
});
