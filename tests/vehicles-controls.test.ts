import {createRockCollider} from '../src/rock-collider';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import {GroundVehicle,dismountPosition} from '../src/ground-vehicle';
import {steerPilot,WALK_SPEED,RUN_SPEED} from '../src/pilot-controls';
import {stepFlight,startFlight} from '../src/flight';
import {terrainHeight,terrainMesh} from '../src/excursion';
import {biomeAt,regionalRelief} from '../src/biomes';
test('pilot steering is separate from camera angles, target slider throttle is bounded and braking wins',()=>{
 const heading={yaw:0,pitch:0};const steered=steerPilot(heading,1,1,.5);assert.equal(heading.yaw,0);assert.ok(steered.yaw<0&&steered.pitch>0);assert.ok(WALK_SPEED<2&&RUN_SPEED>WALK_SPEED);
 let f={...startFlight('nysa'),phase:'flying' as const};for(let i=0;i<300;i++)f=stepFlight(f,{targetThrottle:.4,throttle:0,yaw:steered.yaw,pitch:0,brake:false,boost:false},1/60);assert.ok(Math.abs(f.throttle-.4)<1e-8);
 const before=f.throttle;f=stepFlight(f,{targetThrottle:1,throttle:1,yaw:0,pitch:0,brake:true,boost:true},1/60);assert.ok(f.throttle<before);
});
test('regional relief is deterministic, varied and both landing pads stay flat',()=>{
 assert.deepEqual([biomeAt(-40,25),biomeAt(-40,-35),biomeAt(32,34),biomeAt(42,-39)],['dunes','basalt','wetland','highland']);
 assert.equal(terrainHeight(0,20),0);assert.equal(terrainHeight(-34,-15),0);assert.ok(regionalRelief(-46,-42)>5);assert.ok(terrainHeight(32,34)<-1);assert.ok(terrainHeight(42,-39)>6);
});
test('both vehicle proxies drive on actual terrain, stop at a wall, brake and find a clear dismount',async()=>{
 await RAPIER.init();for(const kind of ['bike','rover'] as const){const world=new RAPIER.World({x:0,y:-9.81,z:0});world.timestep=1/60;const mesh=terrainMesh();world.createCollider(RAPIER.ColliderDesc.trimesh(mesh.vertices,mesh.indices));world.createCollider(RAPIER.ColliderDesc.cuboid(10,5,.2).setTranslation(0,2,10));
 const vehicle=new GroundVehicle(kind,world,{x:0,y:0,z:20});const player=world.createCollider(RAPIER.ColliderDesc.capsule(.55,.3).setTranslation(50,3,50));player.setEnabled(false);
 for(let i=0;i<600;i++){vehicle.step(0,1,false,1/60);world.step();}assert.ok(vehicle.body.translation().z>11,'solid wall arrests vehicle');assert.ok(vehicle.distance>5,'actual displacement occurs');
 for(let i=0;i<90;i++){vehicle.step(0,0,true,1/60);world.step();}assert.ok(vehicle.speed<.01);const out=dismountPosition(world,vehicle,player,terrainHeight);assert.ok(out);assert.ok(Math.hypot(out!.x-vehicle.body.translation().x,out!.z-vehicle.body.translation().z)>2);world.free();}
});

test('both parking areas at each pad allow initial vehicle travel through the complete surface obstacle plan',async()=>{
 const {createSurface}=await import('../src/surface');const {LANDING_PLAN,SURFACE_ORIGIN}=await import('../src/excursion');
 await RAPIER.init();const surface=createSurface();
 for(const pad of LANDING_PLAN)for(const kind of ['bike','rover'] as const){const world=new RAPIER.World({x:0,y:-9.81,z:0});try{
 world.timestep=1/60;world.createCollider(RAPIER.ColliderDesc.trimesh(surface.mesh.vertices,surface.mesh.indices).setTranslation(SURFACE_ORIGIN,0,0));
 for(const o of surface.obstacles)createRockCollider(world,o);
 for(const o of surface.landmarkBoxes)world.createCollider(RAPIER.ColliderDesc.cuboid(o.size[0]/2,o.size[1]/2,o.size[2]/2).setTranslation(SURFACE_ORIGIN+o.x,o.y,o.z));
 world.createCollider(RAPIER.ColliderDesc.cuboid(2.47,1.42,3.32).setTranslation(SURFACE_ORIGIN+pad.x,1.42,pad.z));
 world.step();const x=pad.x+(kind==='bike'?7:-8),z=pad.z+7,vehicle=new GroundVehicle(kind,world,{x:SURFACE_ORIGIN+x,y:terrainHeight(x,z),z});world.step();
 for(let i=0;i<240&&vehicle.distance<=3;i++){vehicle.step(0,.5,false,1/60);world.step();}
 assert.ok(vehicle.distance>3,`${pad.label} ${kind} blocked at ${JSON.stringify(vehicle.snapshot())}`);
 }finally{world.free();}}
});

test('a mounted passenger capsule cannot stall a vehicle even when disabled queries retain it',async()=>{
 const {SURFACE_ORIGIN}=await import('../src/excursion');await RAPIER.init();
 for(const kind of ['bike','rover'] as const){const world=new RAPIER.World({x:0,y:-9.81,z:0});try{world.timestep=1/60;const mesh=terrainMesh();world.createCollider(RAPIER.ColliderDesc.trimesh(mesh.vertices,mesh.indices).setTranslation(SURFACE_ORIGIN,0,0));world.step();const v=new GroundVehicle(kind,world,{x:SURFACE_ORIGIN+7,y:terrainHeight(7,27),z:27});const rider=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(SURFACE_ORIGIN+8.4,1,28.65)),capsule=world.createCollider(RAPIER.ColliderDesc.capsule(.55,.3),rider);capsule.setEnabled(false);world.step();for(let i=0;i<240;i++){v.step(0,.5,false,1/60,capsule);world.step();const p=v.body.translation();rider.setTranslation({x:p.x,y:p.y+1.28,z:p.z},true);}assert.ok(v.distance>3,`${kind} stalled on passenger: ${JSON.stringify(v.snapshot())}`);}finally{world.free();}}
});
