import {test} from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {wetlandPlants,WetlandScenery} from '../src/wetland-plants';
import {terrainMesh,LANDING_PLAN,SAMPLE,surfaceRocks} from '../src/excursion';import {terrainSampler} from '../src/vehicle-stance';import {WATER_LEVEL,biomeWeights} from '../src/biomes';import {FIELD_SITES} from '../src/survey';

test('wetland clumps root into actual terrain, keep mission/rock clearances and avoid water or steep ground',()=>{
 const ground=terrainSampler(terrainMesh().vertices),sites=wetlandPlants(ground);assert.equal(sites.length,64);assert.deepEqual(wetlandPlants(ground),sites);
 for(const [i,p]of sites.entries()){
  assert.ok(ground(p.x,p.z)>WATER_LEVEL);assert.ok(p.y<ground(p.x,p.z));assert.ok(ground(p.x,p.z)-p.y<.19);assert.ok(biomeWeights(p.x,p.z).wetland>.8);
  assert.ok([...LANDING_PLAN,SAMPLE,...FIELD_SITES].every(q=>Math.hypot(p.x-q.x,p.z-q.z)>=6));assert.ok(surfaceRocks().every(r=>Math.hypot(p.x-r.x,p.z-r.z)>=r.radius+1));
  assert.ok(sites.slice(i+1).every(q=>Math.hypot(p.x-q.x,p.z-q.z)>=1.15));
 }
 assert.deepEqual(wetlandPlants(()=>WATER_LEVEL-.1),[]);assert.deepEqual(wetlandPlants((x,z)=>x*10+z*10),[]);
});
test('missing plants retain a rooted fallback, retry only explicitly, deduplicate and replace once with shared instancing',async()=>{
 const sites=wetlandPlants(terrainSampler(terrainMesh().vertices)),map=new THREE.Texture(),sources=[0,1].map(()=>({geometry:new THREE.PlaneGeometry(.6,.6).translate(0,.3,0),material:new THREE.MeshStandardMaterial({map,alphaTest:.35,side:THREE.DoubleSide})}));let calls=0;
 const scenery=new WetlandScenery(sites,async()=>{if(++calls===1)throw Error('missing');return sources;});assert.equal(await scenery.load(),false);assert.equal(scenery.root.children.length,1);assert.equal((scenery.root.children[0]as THREE.InstancedMesh).count,64);assert.equal(await scenery.load(),false);assert.equal(calls,1);
 const a=scenery.load(true),b=scenery.load(true);assert.equal(a,b);assert.equal(await a,true);assert.equal(calls,2);assert.equal(scenery.root.children.length,2);
 for(const [j,m]of scenery.root.children.entries()){
  const mesh=m as THREE.InstancedMesh;assert.equal(mesh.count,32);assert.equal(mesh.geometry,sources[j].geometry);assert.equal(mesh.material,sources[j].material);assert.equal((mesh.material as THREE.MeshStandardMaterial).map,map);assert.equal((mesh.material as THREE.MeshStandardMaterial).alphaTest,.35);
  const matrix=new THREE.Matrix4();mesh.getMatrixAt(0,matrix);assert.ok(new THREE.Vector3().setFromMatrixPosition(matrix).distanceTo(new THREE.Vector3(sites[j].x,sites[j].y,sites[j].z))<3e-6);
 }
 await scenery.load(true);assert.equal(calls,2);assert.equal(scenery.root.children.length,2);
});
test('visual wind clock freezes when paused or hidden and rejects invalid deltas',()=>{
 const scenery=new WetlandScenery([]);scenery.update(.04,true);const t=scenery.snapshot().time;scenery.update(1,false);assert.equal(scenery.snapshot().time,t);scenery.update(NaN,true);assert.equal(scenery.snapshot().time,t);scenery.update(-1,true);assert.equal(scenery.snapshot().time,t);

});
test('reviewed plant derivative retains mesh views, two cutout normal-mapped clumps and bounded embedded images',async()=>{
 const {readFileSync}=await import('node:fs'),{createHash}=await import('node:crypto'),{decodeGameResource}=await import('../src/game-resource');
 const packed=readFileSync(new URL('../src/assets/requested/grass.ebup',import.meta.url)),b=Buffer.from(await decodeGameResource(Uint8Array.from(packed).buffer)),n=b.readUInt32LE(12),g=JSON.parse(b.subarray(20,20+n).toString()),binary=b.subarray(28+n),report=JSON.parse(readFileSync(new URL('../public/assets/requested/grass-conversion.json',import.meta.url),'utf8'));
 assert.ok(packed.length<750000);assert.equal(g.meshes.length,2);assert.equal(g.meshes.reduce((sum:number,m:any)=>sum+g.accessors[m.primitives[0].indices].count/3,0),80);assert.equal(g.animations?.length??0,0);assert.equal(g.skins?.length??0,0);assert.equal(g.images.length,4);
 for(const m of g.materials){assert.equal(m.alphaMode,'MASK');assert.equal(m.alphaCutoff,.35);assert.equal(m.doubleSided,true);assert.ok(m.normalTexture&&m.pbrMetallicRoughness.baseColorTexture);assert.ok(m.emissiveFactor.every((v:number)=>v===0));}
 const expected=new Set(Object.values(report.preserved_mesh_views_sha256));for(const m of g.meshes)for(const a of [m.primitives[0].indices,...Object.values(m.primitives[0].attributes)] as number[]){const v=g.bufferViews[g.accessors[a].bufferView],data=binary.subarray(v.byteOffset,v.byteOffset+v.byteLength);assert.ok(expected.has(createHash('sha256').update(data).digest('hex')));}
 for(const [i,image]of g.images.entries()){const v=g.bufferViews[image.bufferView],png=binary.subarray(v.byteOffset,v.byteOffset+v.byteLength);assert.equal(png.readUInt32BE(16),512);assert.equal(png.readUInt32BE(20),512);assert.equal(createHash('sha256').update(png).digest('hex'),report.images[i].output_sha256);}
 for(const image of report.images.filter((im:any)=>im.source_alpha_coverage!==null))assert.ok(Math.abs(image.source_alpha_coverage-image.output_alpha_coverage)<.001);
 assert.ok(report.bounds.every((p:any)=>p.floor===0&&p.size[1]>.3&&p.size[1]<.66&&Math.max(p.size[0],p.size[2])<=.800001));
});
