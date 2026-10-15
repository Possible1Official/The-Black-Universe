import {test} from 'node:test';import assert from 'node:assert/strict';import RAPIER from '@dimforge/rapier3d-compat';import {GroundVehicle,VEHICLE_SPEC} from '../src/ground-vehicle';
test('rover is faster and both vehicles physically cross their supported rock sizes',async()=>{
 await RAPIER.init();assert.equal(VEHICLE_SPEC.rover.maxSpeed,14);
 for(const [kind,radius,centerY] of [['rover',.65,.15],['bike',.28,.04]] as const){const world=new RAPIER.World({x:0,y:-9.81,z:0});try{world.timestep=1/60;world.createCollider(RAPIER.ColliderDesc.cuboid(30,.2,30).setTranslation(0,-.2,0));world.createCollider(RAPIER.ColliderDesc.ball(radius).setTranslation(0,centerY,0));world.step();const v=new GroundVehicle(kind,world,{x:0,y:0,z:6});let peak=0;
 for(let i=0;i<360;i++){v.step(0,.45,false,1/60);world.step();peak=Math.max(peak,v.body.translation().y-VEHICLE_SPEC[kind].half[1]);if(v.body.translation().z< -4)break;}
 assert.ok(v.body.translation().z< -3,`${kind} stopped at ${JSON.stringify(v.snapshot())}`);assert.ok(peak>.15,`${kind} did not climb`);world.step();assert.ok((v.supportHeight(0,0)??0)>.1,'support probe sees real rock');
 }finally{world.free();}}
});
test('faster rover reaches its new cruise speed and cannot climb a tall vertical barrier',async()=>{
 await RAPIER.init();const world=new RAPIER.World({x:0,y:-9.81,z:0});try{world.timestep=1/60;world.createCollider(RAPIER.ColliderDesc.cuboid(50,.2,100).setTranslation(0,-.2,0));world.createCollider(RAPIER.ColliderDesc.cuboid(10,2,.2).setTranslation(0,2,-30));world.step();const v=new GroundVehicle('rover',world,{x:0,y:0,z:20});for(let i=0;i<180;i++){v.step(0,1,false,1/60);world.step();}assert.ok(v.speed>13);for(let i=0;i<420;i++){v.step(0,1,false,1/60);world.step();}assert.ok(v.body.translation().z> -28.2,'barrier remains solid');}finally{world.free();}
});
