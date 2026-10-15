import {test} from 'node:test';import assert from 'node:assert/strict';
import * as THREE from 'three';import RAPIER from '@dimforge/rapier3d-compat';
import {terrainSampler,terrainStance,VehicleStance,STANCE_LIMIT} from '../src/vehicle-stance';
import {terrainMesh} from '../src/excursion';
test('vehicle support sampling matches actual Nysa collision triangles including grid diagonals and edges',async()=>{
 await RAPIER.init();const world=new RAPIER.World({x:0,y:-9.81,z:0});try{const mesh=terrainMesh();world.createCollider(RAPIER.ColliderDesc.trimesh(mesh.vertices,mesh.indices));world.step();const ground=terrainSampler(mesh.vertices);
 for(const [x,z] of [[12.23,31.7],[-23.6,-18.22],[40.37,-39.81],[-50.12,28.7],[0,20],[127.8,-127.6],[1/3,1/3]]){const hit=world.castRay(new RAPIER.Ray({x,y:50,z},{x:0,y:-1,z:0}),100,true);assert.ok(hit);assert.ok(Math.abs(ground(x,z)-(50-hit.timeOfImpact))<.0001,`${x},${z}`);}
 }finally{world.free();}
});
test('both stances follow the slope in vehicle axes, stay level on pads and bound steep/airborne fitting',()=>{
 for(const kind of ['bike','rover'] as const){const flat=terrainStance(kind,0,0,0,.04,()=>0);assert.deepEqual(flat,{pitch:0,roll:0,offset:0});
 const slope=(x:number,z:number)=>.1*x-.2*z;const front=terrainStance(kind,0,0,0,.04,slope);assert.ok(front.pitch>0&&front.roll>0);
 const turned=terrainStance(kind,0,0,Math.PI/2,.04,slope);assert.ok(turned.pitch<0&&turned.roll>0);
 const steep=terrainStance(kind,0,0,0,.04,(x,z)=>5*x-5*z);assert.equal(steep.pitch,STANCE_LIMIT);assert.equal(steep.roll,STANCE_LIMIT);
 assert.deepEqual(terrainStance(kind,0,0,0,4,slope),{pitch:0,roll:0,offset:0});
 }
});
test('stance smoothing keeps rider local anchor attached, resets on relocation and returns level on relocation',()=>{
 const stance=new VehicleStance(),mesh=new THREE.Group(),ground=(x:number,z:number)=>.1*x-.15*z;
 stance.update('bike',mesh,0,.79,0,0,ground,1/60);const initial=stance.pitch;
 stance.update('bike',mesh,.1,.79,0,0,()=>0,1/60);assert.ok(stance.pitch>0&&stance.pitch<initial);
 const seat=new THREE.Vector3(0,0,.43),rider=mesh.localToWorld(seat.clone());assert.ok(Math.abs(rider.y-mesh.position.y)>.01,'seat must follow tilted chassis');
 stance.update('bike',mesh,20,.79,0,0,()=>0,1/60);assert.equal(stance.pitch,0);assert.equal(stance.roll,0);assert.ok(Math.abs(mesh.position.y-.04)<1e-8);
});
