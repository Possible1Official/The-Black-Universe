import {test} from 'node:test';import assert from 'node:assert/strict';import RAPIER from '@dimforge/rapier3d-compat';
import {FootstepPace,soundMix,type SoundState} from '../src/soundscape';
import {PLAYER_MOTION_STRIDES} from '../src/locomotion-strides';import {readFileSync} from 'node:fs';import {WALK_SPEED,RUN_SPEED} from '../src/pilot-controls';
test('distance cadence matches actual player capture provenance across walking, running and frame partitions',()=>{
 const count=(speed:number,running:number,dt:number)=>{const pace=new FootstepPace();let steps=0;for(let i=0;i<Math.round(6/dt);i++)if(pace.sample(speed*dt,true,-.2,dt,running)?.kind==='step')steps++;return steps;};
 const provenance=JSON.parse(readFileSync('public/assets/requested/motion-provenance.json','utf8')).strides_m;
 assert.equal(PLAYER_MOTION_STRIDES.walk,provenance.Walking);assert.equal(PLAYER_MOTION_STRIDES.run,provenance.Running);
 assert.equal(count(WALK_SPEED,0,1/60),count(WALK_SPEED,0,1/20));assert.equal(count(RUN_SPEED,1,1/60),count(RUN_SPEED,1,1/20));assert.equal(count(WALK_SPEED,0,1/60),Math.floor(WALK_SPEED*6/(provenance.Walking/2)));assert.equal(count(RUN_SPEED,1,1/60),Math.floor(RUN_SPEED*6/(provenance.Running/2)));assert.ok(count(2.2,1,1/60)<count(2.2,0,1/60),'running uses longer steps rather than rapid short steps');
});
test('stationary intent, airtime, teleports, mute and reset produce no phantom steps or landing bursts',()=>{
 const pace=new FootstepPace();for(let i=0;i<300;i++)assert.equal(pace.sample(0,true,-.2,1/60,0),undefined);
 pace.sample(.2,true,-.2,1/60,0);for(const dt of [0,-1,NaN,Infinity])assert.equal(pace.sample(100,true,-10,dt,0),undefined);
 assert.equal(pace.sample(20,true,-.2,1/60,0),undefined);for(let i=0;i<30;i++)assert.equal(pace.sample(.04,false,-4,1/60,0),undefined);assert.equal(pace.sample(0,true,-.2,1/60,0),undefined,'unprimed spawn fall is not a jump landing');
 pace.sample(.5,true,-.2,1/60,0);assert.equal(pace.sample(.1,true,-.2,1/60,0,false),undefined);assert.equal(pace.sample(.2,true,-.2,1/60,0),undefined);pace.reset();assert.equal(pace.sample(.3,true,-.2,1/60,0),undefined);
});
test('actual Rapier wall contact stops footsteps and a real jump emits one landing without airborne steps',async()=>{
 await RAPIER.init();const world=new RAPIER.World({x:0,y:-9.81,z:0});try{
  world.createCollider(RAPIER.ColliderDesc.cuboid(20,.1,20).setTranslation(0,-.1,0));world.createCollider(RAPIER.ColliderDesc.cuboid(3,4,.1).setTranslation(0,3,-3));
  const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,.86,0)),collider=world.createCollider(RAPIER.ColliderDesc.capsule(.6,.24),body),controller=world.createCharacterController(.008);controller.enableSnapToGround(.2);world.step();const pace=new FootstepPace();let vertical=-.2,steps=0,landings=0,airSteps=0;const counts:number[]=[];
  for(let i=0;i<480;i++){
   const dt=1/60,grounded=controller.computedGrounded();vertical=i===280?5:grounded?-.2:vertical-9.81*dt;const before=body.translation();controller.computeColliderMovement(collider,{x:0,y:vertical*dt,z:i<250?-2.2*dt:0});const movement=controller.computedMovement();body.setNextKinematicTranslation({x:before.x+movement.x,y:before.y+movement.y,z:before.z+movement.z});world.step();
   const p=body.translation(),g=controller.computedGrounded(),event=pace.sample(Math.hypot(p.x-before.x,p.z-before.z),g,vertical,dt,0);if(event?.kind==='land')landings++;if(event?.kind==='step'){steps++;if(!g)airSteps++;}if(i===150||i===249)counts.push(steps);
  }
  assert.ok(steps>=3);assert.equal(counts[0],counts[1],'held movement into the wall cannot play footsteps');assert.equal(airSteps,0);assert.equal(landings,1);
 }finally{world.free();}
});
test('scene-specific ambience, distinct motors and brake-priority load handle real state changes and invalid inputs',()=>{
 const base:SoundState={location:'ship',vehicle:null,speed:0,demand:0,brake:false,boost:false,tripped:false};const aboard=soundMix(base);assert.ok(aboard.ship>0);assert.equal(aboard.wind,0);assert.equal(aboard.motor,0);
 const surface=soundMix({...base,location:'surface'});assert.equal(surface.ship,0);assert.ok(surface.wind>0);assert.equal(soundMix({...base,location:'flight'}).wind,0);assert.equal(soundMix({...base,location:'flight'}).ship,0);
 const bike=soundMix({...base,location:'surface',vehicle:'bike',speed:1,demand:1}),rover=soundMix({...base,location:'surface',vehicle:'rover',speed:1,demand:1});assert.ok(bike.frequency>rover.frequency*2);assert.ok(bike.rolling>0);assert.equal(soundMix({...base,vehicle:'shuttle',location:'flight',speed:1}).rolling,0);
 const thrust=soundMix({...base,vehicle:'shuttle',demand:1,boost:true}),brake=soundMix({...base,vehicle:'shuttle',demand:1,boost:true,brake:true});assert.ok(brake.motor<thrust.motor/3);assert.equal(brake.motor,soundMix({...base,vehicle:'shuttle',brake:true}).motor);assert.ok(soundMix({...base,tripped:true}).ship<aboard.ship);
 for(const bad of [NaN,Infinity,-5])for(const n of Object.values(soundMix({...base,vehicle:'bike',speed:bad,demand:bad})))assert.ok(Number.isFinite(n)&&n>=0);
});
