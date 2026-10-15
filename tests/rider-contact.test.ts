import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {decodeGameResource} from '../src/game-resource';
import {BIKE_GRIPS,BIKE_RIDER_SEAT,solveArm} from '../src/rider-contact';
import {CrewVisual} from '../src/crew-visual';

// Use the shipped geometry/skin/clips in Node, omitting only image decoding.
// This fixture does not alter the resource or claim rendered texture QA.
async function geometry(kind:'biker'|'bike'){
 const packed=readFileSync(new URL(`../src/assets/requested/${kind}.ebup`,import.meta.url)),b=Buffer.from(await decodeGameResource(Uint8Array.from(packed).buffer)),n=b.readUInt32LE(12),g=JSON.parse(b.subarray(20,20+n).toString()),bin=b.subarray(28+n);
 g.materials=[{}];g.images=[];g.textures=[];g.extensionsRequired=[];g.extensionsUsed=[];for(const m of g.meshes)for(const p of m.primitives)p.material=0;
 const j=Buffer.from(JSON.stringify(g)),padding=Buffer.alloc((4-j.length%4)%4,32),head=Buffer.alloc(20),bh=Buffer.alloc(8);head.writeUInt32LE(0x46546c67);head.writeUInt32LE(2,4);head.writeUInt32LE(28+j.length+padding.length+bin.length,8);head.writeUInt32LE(j.length+padding.length,12);head.writeUInt32LE(0x4e4f534a,16);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);const data=Buffer.concat([head,j,padding,bh,bin]);return new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
}
const worldPoint=(o:THREE.Object3D)=>o.getWorldPosition(new THREE.Vector3());
test('two-bone solve preserves lengths under parent tilt/scale and bounds unreachable or collinear targets',()=>{
 const parent=new THREE.Group(),upper=new THREE.Bone(),lower=new THREE.Bone(),hand=new THREE.Bone();parent.position.set(12,3,-4);parent.rotation.set(.2,.8,-.3);parent.scale.setScalar(.9);parent.add(upper);upper.add(lower);lower.add(hand);lower.position.set(.2,-.2,0);hand.position.set(.02,-.25,.1);parent.updateMatrixWorld(true);
 const lengths=[worldPoint(upper).distanceTo(worldPoint(lower)),worldPoint(lower).distanceTo(worldPoint(hand))],target=parent.localToWorld(new THREE.Vector3(.25,-.2,-.2)),pole=parent.localToWorld(new THREE.Vector3(.4,0,.2));solveArm(upper,lower,hand,target,pole);assert.ok(worldPoint(hand).distanceTo(target)<1e-6);
 solveArm(upper,lower,hand,target.clone().addScalar(50),pole);assert.ok(Math.abs(worldPoint(upper).distanceTo(worldPoint(lower))-lengths[0])<1e-6);assert.ok(Math.abs(worldPoint(lower).distanceTo(worldPoint(hand))-lengths[1])<1e-6);assert.ok(worldPoint(hand).distanceTo(worldPoint(upper))<=lengths[0]+lengths[1]);
 const s=worldPoint(upper);solveArm(upper,lower,hand,s.clone().add(new THREE.Vector3(0,1,0)),s.clone().add(new THREE.Vector3(0,2,0)));assert.ok([...upper.quaternion,...lower.quaternion].every(Number.isFinite));solveArm(upper,lower,hand,s,s);assert.ok([...upper.quaternion,...lower.quaternion].every(Number.isFinite));
});

test('actual CGTrader rider reaches both grips on tilted chassis, retains lengths and restores walking without drift',async()=>{
 const asset=await geometry('biker'),actor=new THREE.Group(),bike=new THREE.Group();actor.add(asset.scene);const visual=new CrewVisual(asset.scene,asset.animations,1.465755,3.50991),bones:THREE.Bone[]=[];asset.scene.traverse(o=>{if(o instanceof THREE.Bone)bones.push(o);});
 for(const angles of [[0,0,0],[.22,1.3,-.36],[-.25,-2,.3]]){
  bike.position.set(16000,2,12);bike.rotation.set(...angles as [number,number,number],'YXZ');bike.updateMatrixWorld(true);actor.position.copy(bike.localToWorld(BIKE_RIDER_SEAT.clone()));bike.getWorldQuaternion(actor.quaternion);actor.rotateY(Math.PI);visual.update(1/60,0,0,0,true);actor.updateMatrixWorld(true);
  const before=bones.map(b=>({q:b.quaternion.clone(),position:b.position.clone(),scale:b.scale.clone()}));visual.fitBikeContact(bike);const result=visual.snapshot().contact!;assert.equal(result.palmErrors.length,2);assert.ok(result.palmErrors.every(e=>e<.003),JSON.stringify(result));const fitted=bones.map(b=>b.quaternion.clone());
  for(let i=0;i<12;i++)visual.fitBikeContact(bike);for(let i=0;i<bones.length;i++){assert.ok(bones[i].quaternion.toArray().every((v,j)=>Math.abs(v-fitted[i].toArray()[j])<1e-7),JSON.stringify({bone:bones[i].name,before:fitted[i].toArray(),after:bones[i].quaternion.toArray()}));assert.deepEqual(bones[i].position,before[i].position);assert.deepEqual(bones[i].scale,before[i].scale);}
  visual.releaseBikeContact();assert.equal(visual.snapshot().contact!.active,false);for(let i=0;i<bones.length;i++)assert.ok(bones[i].quaternion.clone().normalize().angleTo(before[i].q.clone().normalize())<1e-6);
 }
 visual.update(.1,.1,1);const walking=bones.map(b=>b.quaternion.clone());visual.fitBikeContact(bike);visual.update(0,0,1);for(let i=0;i<bones.length;i++)assert.ok(bones[i].quaternion.clone().normalize().angleTo(walking[i].clone().normalize())<1e-6,'contact override must not leak into walking');
});

test('reviewed grip targets sit on the actual packaged handlebar geometry',async()=>{
 const asset=await geometry('bike');asset.scene.updateMatrixWorld(true);
 const bars:THREE.Mesh[]=[];asset.scene.traverse(o=>{if(o instanceof THREE.Mesh&&o.name.startsWith('40_wheel'))bars.push(o);});assert.ok(bars.length>=3);
 for(const grip of BIKE_GRIPS){let nearest=Infinity;for(const mesh of bars){const position=mesh.geometry.getAttribute('position');for(let i=0;i<position.count;i++){const vertex=new THREE.Vector3().fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld);nearest=Math.min(nearest,vertex.distanceTo(grip));}}assert.ok(nearest<.04,`grip too far from authored handlebars: ${nearest}`);}
});
