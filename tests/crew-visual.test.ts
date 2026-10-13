import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {CrewVisual,WALK_STRIDE} from '../src/crew-visual';

test('shipped rig is self-contained, bounded, and has in-place idle/walk animation',()=>{
  const file=readFileSync(new URL('../public/assets/crew/ely.glb',import.meta.url));
  assert.equal(file.readUInt32LE(0),0x46546c67);assert.ok(file.byteLength<8_000_000);
  const jsonLength=file.readUInt32LE(12);
  const asset=JSON.parse(file.subarray(20,20+jsonLength).toString());
  const bin=file.subarray(28+jsonLength);
  assert.deepEqual(asset.animations.map((a:any)=>a.name),['Idle','Walking']);
  assert.equal(asset.skins.length,1);assert.ok(asset.skins[0].joints.length<=80);
  assert.ok(asset.buffers.every((b:any)=>!b.uri));
  const hip=asset.nodes.findIndex((n:any)=>n.name==='mixamorig:Hips');assert.ok(hip>=0);
  for(const anim of asset.animations){
    assert.ok(anim.channels.some((c:any)=>c.target.path==='rotation'));
    const channel=anim.channels.find((c:any)=>c.target.node===hip&&c.target.path==='translation');
    const a=asset.accessors[anim.samplers[channel.sampler].output],view=asset.bufferViews[a.bufferView];
    const values=new Float32Array(bin.buffer,bin.byteOffset+view.byteOffset+(a.byteOffset??0),a.count*3);
    // FBX bone-local vertical maps to glTF Z; X/Y are ground drift before the armature transform.
    for(const axis of [0,1]){const components=Array.from(values).filter((_,i)=>i%3===axis);assert.ok(Math.max(...components)-Math.min(...components)<.0001);}
    const duration=asset.accessors[anim.samplers[channel.sampler].input].max[0];assert.ok(duration>0&&duration<10);
  }
  for(const image of asset.images){assert.equal(image.uri,undefined);const view=asset.bufferViews[image.bufferView];const png=bin.subarray(view.byteOffset,view.byteOffset+view.byteLength);assert.equal(image.mimeType,'image/png');assert.ok(png.readUInt32BE(16)<=2048&&png.readUInt32BE(20)<=2048);}
  const indices=asset.meshes.flatMap((m:any)=>m.primitives.map((p:any)=>asset.accessors[p.indices].count));assert.ok(indices.reduce((a:number,b:number)=>a+b,0)/3<40_000);
});

test('actual mixer blends poses, advances walk by distance, and isolates actors',()=>{
  const clips=[new THREE.AnimationClip('Idle',2,[new THREE.NumberKeyframeTrack('.rotation[x]',[0,2],[0,0])]),new THREE.AnimationClip('Walking',1,[new THREE.NumberKeyframeTrack('.rotation[x]',[0,1],[0,1])])];
  const a=new CrewVisual(new THREE.Group(),clips),b=new CrewVisual(new THREE.Group(),clips);
  a.update(.2,WALK_STRIDE/4,1);assert.ok(Math.abs(a.root.rotation.x-.25)<1e-6);assert.equal(b.root.rotation.x,0);
  a.update(.2,0,.5);assert.ok(Math.abs(a.root.rotation.x-.125)<1e-6);assert.equal(a.snapshot().walkTime,.25);
  a.update(0,0,0);assert.equal(a.root.rotation.x,0);assert.equal(a.snapshot().walkTime,.25);
  assert.throws(()=>new CrewVisual(new THREE.Group(),[]),/Idle and Walking/);
});
