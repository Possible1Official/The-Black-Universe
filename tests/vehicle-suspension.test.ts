import {test} from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';import {VehicleSuspension,springStep} from '../src/vehicle-suspension';import {VehicleStance} from '../src/vehicle-stance';
test('rover wheels articulate independently over one rock while body anchor stays fixed',()=>{
 const actor=new THREE.Group();actor.userData.requested='rover';for(const [s,x,z,y] of [['FrontLeft',.74,-1.36,.4],['FrontRight',-.74,-1.36,.4],['RearLeft',.84,1.25,.5],['RearRight',-.84,1.25,.5]] as const){const w=new THREE.Group();w.name='Rover_Wheel_'+s;w.position.set(x,y,z);actor.add(w);}const fx=new VehicleSuspension('rover'),ground=(x:number,z:number)=>x>.4&&z<0?.4:0;
 for(let i=0;i<120;i++)fx.update(actor,ground,1/60);assert.ok(fx.offsets[0]>.35);assert.ok(fx.offsets.slice(1).every(x=>Math.abs(x)<.02));assert.equal(actor.position.y,0);assert.equal(fx.root.children.length,3);const stopped=fx.snapshot();fx.update(actor,()=>0,0);assert.deepEqual(fx.snapshot(),stopped);
 for(let i=0;i<180;i++)fx.update(actor,()=>0,1/60);assert.ok(fx.offsets.every(x=>Math.abs(x)<.02));
});
test('bike leans into both turn directions and suspension spring remains bounded under spikes',()=>{
 const a=new THREE.Group(),b=new THREE.Group(),left=new VehicleStance(),right=new VehicleStance();left.update('bike',a,0,.79,0,0,()=>0,1/60,1,10);right.update('bike',b,0,.79,0,0,()=>0,1/60,-1,10);assert.ok(a.rotation.z>.3&&b.rotation.z<-.3);
 let value=0,velocity=0;for(let i=0;i<300;i++){const s=springStep(value,velocity,i<50?3:0,.1,.55);value=s.value;velocity=s.velocity;assert.ok(Number.isFinite(value)&&Math.abs(value)<=.55);}assert.ok(Math.abs(value)<.001);
});
