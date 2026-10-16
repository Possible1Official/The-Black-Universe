import {test} from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';import {VehicleSuspension,springStep} from '../src/vehicle-suspension';import {VehicleStance} from '../src/vehicle-stance';
import {readFileSync} from 'node:fs';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {decodeGameResource} from '../src/game-resource';
async function rover(){
 const packed=readFileSync(new URL('../src/assets/requested/rover.ebup',import.meta.url)),b=Buffer.from(await decodeGameResource(Uint8Array.from(packed).buffer)),n=b.readUInt32LE(12),g=JSON.parse(b.subarray(20,20+n).toString()),bin=b.subarray(28+n);
 // Real geometry/hierarchy, omit only browser image decoding in Node.
 g.materials=[{}];g.images=[];g.textures=[];for(const m of g.meshes)for(const p of m.primitives)p.material=0;
 const j=Buffer.from(JSON.stringify(g)),pad=Buffer.alloc((4-j.length%4)%4,32),head=Buffer.alloc(20),bh=Buffer.alloc(8);head.writeUInt32LE(0x46546c67);head.writeUInt32LE(2,4);head.writeUInt32LE(28+j.length+pad.length+bin.length,8);head.writeUInt32LE(j.length+pad.length,12);head.writeUInt32LE(0x4e4f534a,16);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);const data=Buffer.concat([head,j,pad,bh,bin]),asset=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');const actor=new THREE.Group();actor.userData.requested='rover';actor.add(asset.scene);return actor;
}
test('actual complete rover wheel and arm swing about a fixed hip while the other legs stay independent',async()=>{
 const actor=await rover(),fx=new VehicleSuspension('rover'),labels=['FrontLeft','FrontRight','RearLeft','RearRight'],hips=labels.map(s=>actor.getObjectByName('Rover_Leg_'+s)!),hubs=labels.map(s=>actor.getObjectByName('Rover_Hub_'+s)!),wheels=labels.map(s=>actor.getObjectByName('Rover_Wheel_'+s)!);
 actor.updateMatrixWorld(true);const anchors=hips.map(o=>o.getWorldPosition(new THREE.Vector3())),rests=hubs.map(o=>o.getWorldPosition(new THREE.Vector3())),radii=rests.map((p,i)=>p.distanceTo(anchors[i]));const ground=(x:number,z:number)=>x>.4&&z<-.7?.3:0;
 for(let i=0;i<150;i++)fx.update(actor,ground,1/60);assert.ok(fx.offsets[0]>.28);assert.ok(fx.offsets.slice(1).every(x=>Math.abs(x)<.012));assert.equal(actor.position.y,0);assert.equal(fx.root.children.length,0,'no floating decorative shock overlays');
 for(let i=0;i<4;i++){
  assert.ok(hips[i].getWorldPosition(new THREE.Vector3()).distanceTo(anchors[i])<1e-8,'body hinge cannot detach');const wheel=hubs[i].getWorldPosition(new THREE.Vector3());assert.ok(Math.abs(wheel.distanceTo(anchors[i])-radii[i])<1e-8,'rigid arm does not stretch');
  assert.ok(Math.abs(wheel.y-ground(wheel.x,wheel.z)-(i<2?.398:.501))<.005);assert.ok(hubs[i].getWorldQuaternion(new THREE.Quaternion()).angleTo(new THREE.Quaternion())<1e-6,'wheel carrier stays upright');
  assert.equal(wheels[i].children.length,2);assert.ok(wheels[i].getObjectByName('Rover_Rim_'+labels[i]));assert.ok(wheels[i].getObjectByName('Rover_Tire_'+labels[i]));
 }
 assert.ok(Math.abs(hubs[0].getWorldPosition(new THREE.Vector3()).z-rests[0].z)>.05,'wheel follows an arc, not vertical sliding');const stopped=fx.snapshot();fx.update(actor,()=>0,0);assert.deepEqual(fx.snapshot(),stopped);
 for(let i=0;i<180;i++)fx.update(actor,()=>0,1/60);assert.ok(fx.offsets.every(x=>Math.abs(x)<.012));
});
test('actual hinged rover stays connected through chassis tilt, wheel steering/spin and saturated terrain travel',async()=>{
 const actor=await rover(),fx=new VehicleSuspension('rover');actor.position.set(400,2,-20);actor.rotation.set(.16,.9,-.12);const hip=actor.getObjectByName('Rover_Leg_RearLeft')!,wheel=actor.getObjectByName('Rover_Wheel_RearLeft')!,hub=actor.getObjectByName('Rover_Hub_RearLeft')!;actor.updateMatrixWorld(true);const anchor=hip.getWorldPosition(new THREE.Vector3()),length=anchor.distanceTo(hub.getWorldPosition(new THREE.Vector3()));
 for(let i=0;i<200;i++){wheel.rotation.set(i*.03,0,0);actor.getObjectByName('Rover_Knuckle_RearLeft')!.rotation.y=.2;fx.update(actor,(x,z)=>2+.1*Math.sin(x)+.1*Math.cos(z),1/60);assert.ok(Math.abs(anchor.distanceTo(hub.getWorldPosition(new THREE.Vector3()))-length)<1e-6);assert.ok(hip.getWorldPosition(new THREE.Vector3()).distanceTo(anchor)<1e-8);}
 assert.ok(fx.snapshot().angles.every(a=>Number.isFinite(a)&&Math.abs(a)<=.48));assert.equal(wheel.children.length,2);
});
test('steering and tire roll pivot around the inboard knuckle without pulling the axle off the arm',async()=>{
 const actor=await rover(),fx=new VehicleSuspension('rover'),knuckle=actor.getObjectByName('Rover_Knuckle_FrontLeft')!,wheel=actor.getObjectByName('Rover_Wheel_FrontLeft')!;
 for(let i=0;i<150;i++)fx.update(actor,()=>0,1/60);const pivot=knuckle.getWorldPosition(new THREE.Vector3()),center=wheel.getWorldPosition(new THREE.Vector3()),reach=center.distanceTo(pivot);
 for(const angle of [-.45,0,.45]){knuckle.rotation.y=angle;wheel.rotation.x=2.1;fx.update(actor,()=>0,1/60);assert.ok(knuckle.getWorldPosition(new THREE.Vector3()).distanceTo(pivot)<1e-7);assert.ok(Math.abs(wheel.getWorldPosition(new THREE.Vector3()).distanceTo(pivot)-reach)<1e-7);assert.equal(wheel.rotation.y,0);}
 assert.ok(wheel.getWorldPosition(new THREE.Vector3()).distanceTo(center)>.1,'steering follows an inboard arc');
});
test('bike leans into both turn directions and suspension spring remains bounded under spikes',()=>{
 const a=new THREE.Group(),b=new THREE.Group(),left=new VehicleStance(),right=new VehicleStance();left.update('bike',a,0,.79,0,0,()=>0,1/60,1,10);right.update('bike',b,0,.79,0,0,()=>0,1/60,-1,10);assert.ok(a.rotation.z>.3&&b.rotation.z<-.3);
 let value=0,velocity=0;for(let i=0;i<300;i++){const s=springStep(value,velocity,i<50?3:0,.1,.55);value=s.value;velocity=s.velocity;assert.ok(Number.isFinite(value)&&Math.abs(value)<=.55);}assert.ok(Math.abs(value)<.001);
});
