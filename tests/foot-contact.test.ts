import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {decodeGameResource} from '../src/game-resource';
import {FootContact} from '../src/foot-contact';
import {CrewVisual} from '../src/crew-visual';
async function geometry(kind:'biker'|'bike'){
 const packed=readFileSync(new URL(`../src/assets/requested/${kind}.ebup`,import.meta.url)),b=Buffer.from(await decodeGameResource(Uint8Array.from(packed).buffer)),n=b.readUInt32LE(12),g=JSON.parse(b.subarray(20,20+n).toString()),bin=b.subarray(28+n);
 g.materials=[{}];g.images=[];g.textures=[];g.extensionsRequired=[];g.extensionsUsed=[];for(const m of g.meshes)for(const p of m.primitives)p.material=0;
 const j=Buffer.from(JSON.stringify(g)),padding=Buffer.alloc((4-j.length%4)%4,32),head=Buffer.alloc(20),bh=Buffer.alloc(8);head.writeUInt32LE(0x46546c67);head.writeUInt32LE(2,4);head.writeUInt32LE(28+j.length+padding.length+bin.length,8);head.writeUInt32LE(j.length+padding.length,12);head.writeUInt32LE(0x4e4f534a,16);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);const data=Buffer.concat([head,j,padding,bh,bin]);return new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
}

test('reviewed biker feet reach bounded tilted support without stretching; source pose restores without drift',async()=>{
 const asset=await geometry('biker'),actor=new THREE.Group();actor.add(asset.scene);actor.position.set(442,2,-38);actor.rotation.y=.8;
 const visual=new CrewVisual(asset.scene,asset.animations,1.465755,3.50991),fit=new FootContact(asset.scene),bones:THREE.Bone[]=[];asset.scene.traverse(o=>{if(o instanceof THREE.Bone)bones.push(o);});
 for(const slope of [.18,-.18,.3]){
  visual.update(.1,0,0);actor.updateMatrixWorld(true);const source=bones.map(b=>({p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone()}));
  const ground=(x:number,z:number)=>2+slope*(x-442)+.08*(z+38);fit.apply(ground);const result=fit.snapshot();assert.ok(result.active);assert.ok(result.drop>=-.1&&result.drop<=0);assert.ok(result.legs.every(l=>l.error<.025&&Math.abs(l.shift)<=.18),JSON.stringify(result));
  for(const side of ['Left','Right']){const toe=bones.find(b=>b.name==='mixamorig'+side+'ToeBase')!.getWorldPosition(new THREE.Vector3());assert.ok(toe.y-ground(toe.x,toe.z)>-.025,JSON.stringify({side,slope,toe:toe.toArray(),ground:ground(toe.x,toe.z),result}));}
  const fitted=bones.map(b=>b.quaternion.clone());for(let i=0;i<10;i++)fit.apply(ground);for(let i=0;i<bones.length;i++){assert.ok(bones[i].quaternion.toArray().every((v,j)=>Math.abs(v-fitted[i].toArray()[j])<1e-7));assert.deepEqual(bones[i].scale,source[i].s);if(!bones[i].name.endsWith('Hips'))assert.deepEqual(bones[i].position,source[i].p);}
  fit.restore();assert.ok(!fit.snapshot().active);for(let i=0;i<bones.length;i++){assert.deepEqual(bones[i].position,source[i].p);assert.deepEqual(bones[i].quaternion.toArray(),source[i].q.toArray());}
 }
});

test('invalid support does not corrupt skeleton; next animation/jump update restores all contact overrides',async()=>{
 const asset=await geometry('biker'),visual=new CrewVisual(asset.scene,asset.animations,1.465755,3.50991),bones:THREE.Bone[]=[];asset.scene.traverse(o=>{if(o instanceof THREE.Bone)bones.push(o);});
 visual.update(.1,.1,1);const original=bones.map(b=>({p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone()}));visual.fitFootContact(()=>NaN);assert.equal(visual.snapshot().feet!.active,false);
 for(let i=0;i<bones.length;i++){assert.deepEqual(bones[i].position,original[i].p);assert.ok(bones[i].quaternion.toArray().every((v,j)=>Math.abs(v-original[i].q.toArray()[j])<1e-7));}
 visual.fitFootContact(()=>-1);assert.equal(visual.snapshot().feet!.active,false,'elevated prop support must keep source feet');
 visual.fitFootContact((x,z)=>x*.2+z*.1);assert.ok(visual.snapshot().feet!.active);visual.update(0,0,1);
 for(let i=0;i<bones.length;i++){assert.deepEqual(bones[i].position,original[i].p);assert.ok(bones[i].quaternion.toArray().every((v,j)=>Math.abs(v-original[i].q.toArray()[j])<1e-7));assert.deepEqual(bones[i].scale,original[i].s);}
 visual.fitFootContact((x,z)=>x*.2);visual.update(.05,0,0,0,false,true,3);assert.equal(visual.snapshot().feet!.active,false);assert.ok(visual.snapshot().jumpWeight>0);
 visual.fitFootContact((x,z)=>x*.2);visual.update(.05,0,0,0,true);assert.equal(visual.snapshot().feet!.active,false);assert.equal(visual.snapshot().ridingWeight,1);
});
