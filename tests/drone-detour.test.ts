import {test} from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import {SurveyDrone,DRONE_HEIGHT,DRONE_RADIUS,droneMotion} from '../src/survey-drone';
import {droneDetour,DETOUR_SWEEPS} from '../src/drone-detour';
import {DroneFollow} from '../src/drone-follow';

async function fixture(wallHalfWidth=.8){
 await RAPIER.init();const world=new RAPIER.World({x:0,y:0,z:0});
 world.createCollider(RAPIER.ColliderDesc.cuboid(30,.1,30).setTranslation(0,-.1,0));
 world.createCollider(RAPIER.ColliderDesc.cuboid(wallHalfWidth,2,.3).setTranslation(0,2,-2));
 const visitor={x:0,y:.9,z:-6},observer=world.createCollider(RAPIER.ColliderDesc.capsule(.6,.24).setTranslation(visitor.x,visitor.y,visitor.z));world.step();
 const drone=new SurveyDrone(()=>0);drone.recover();drone.root.position.set(0,DRONE_HEIGHT,0);drone.startFollowing(drone.visitor(world,visitor,observer));
 return {world,visitor,observer,drone};
}
test('ECHO autonomously detours a real solid obstacle and resumes the original walked route without teleporting',async()=>{
 const {world,visitor,observer,drone}=await fixture();try{
  const count=world.colliders.len();let lateral=0,detouring=false;
  for(let i=0;i<650;i++){
   const before=drone.root.position.clone();drone.step(world,visitor,observer,1/60);
   const delta=drone.root.position.clone().sub(before);assert.ok(delta.length()<=5/60+1e-6);
   assert.ok(Math.abs(drone.root.position.y-DRONE_HEIGHT)<1e-5);
   assert.ok(droneMotion(world,before,delta,observer).length()>=delta.length()-1e-5,'each executed segment must remain swept-volume clear');
   lateral=Math.max(lateral,Math.abs(drone.root.position.x));detouring ||=drone.snapshot().status==='detouring';
  }
  const s=drone.snapshot();assert.ok(lateral>.8+DRONE_RADIUS);assert.ok(detouring);assert.equal(s.detours,1);assert.equal(s.command,'follow');assert.equal(s.status,'waiting');assert.ok(drone.root.position.z< -3.3);assert.ok(drone.root.position.distanceTo({x:0,y:DRONE_HEIGHT,z:-6})<2.7);assert.equal(world.colliders.len(),count);
  assert.ok(s.lastSearch.sweeps<=DETOUR_SWEEPS);assert.ok(s.lastSearch.samples<=80);assert.equal(s.lastSearch.found,true);
 }finally{world.free();}
});
test('sealed routes and embedded starts stop safely with one bounded search, no wall warp or retry storm',async()=>{
 const {world,visitor,observer,drone}=await fixture(30);try{
  for(let i=0;i<500;i++)drone.step(world,visitor,observer,1/60);
  const stopped=drone.snapshot();assert.equal(stopped.status,'blocked');assert.equal(stopped.command,'hold');assert.equal(stopped.detours,0);assert.equal(stopped.lastSearch.found,false);assert.ok(stopped.lastSearch.sweeps>0&&stopped.lastSearch.sweeps<=DETOUR_SWEEPS);assert.ok(stopped.lastSearch.samples<=80);assert.ok(drone.root.position.z> -2+.3+DRONE_RADIUS);
  for(let i=0;i<200;i++)drone.step(world,visitor,observer,1/60);assert.deepEqual(drone.snapshot(),stopped);
  drone.root.position.set(0,DRONE_HEIGHT,-2);drone.startFollowing(drone.visitor(world,visitor,observer));for(let i=0;i<200;i++)drone.step(world,visitor,observer,1/60);assert.equal(drone.root.position.z,-2);assert.equal(drone.snapshot().status,'blocked');
 }finally{world.free();}
});
test('pause, manual Hold, scanning, vehicle boarding and redeployment cancel or freeze detours cleanly',async()=>{
 const {world,visitor,observer,drone}=await fixture();try{
  for(let i=0;i<100&&drone.snapshot().detours===0;i++)drone.step(world,visitor,observer,1/60);assert.equal(drone.snapshot().status,'detouring');
  const paused=drone.snapshot();for(const dt of [0,-1,NaN,Infinity])drone.step(world,visitor,observer,dt);assert.deepEqual(drone.snapshot(),paused);
  drone.hold();const held=drone.snapshot();for(let i=0;i<60;i++)drone.step(world,visitor,observer,1/60);assert.deepEqual(drone.snapshot(),held);assert.equal(held.queued,0);
  drone.startFollowing(drone.visitor(world,visitor,observer));drone.startScan('arch');assert.equal(drone.snapshot().command,'hold');assert.equal(drone.snapshot().queued,0);assert.equal(drone.snapshot().scan?.id,'arch');
  drone.step(world,visitor,observer,1/60,false);assert.equal(drone.snapshot().scan,null);assert.equal(drone.snapshot().command,'hold');
  drone.startFollowing(drone.visitor(world,visitor,observer));drone.arrive(true,{x:0,z:0});assert.equal(drone.snapshot().command,'hold');assert.equal(drone.snapshot().queued,0);
 }finally{world.free();}
});
test('detour candidates follow supporting slopes and reject missing floors, distant goals and unbounded trail insertion',async()=>{
 await RAPIER.init();const world=new RAPIER.World({x:0,y:0,z:0});try{
  const vertices=new Float32Array([-20,-2,-20,20,2,-20,-20,-2,20,20,2,20]);world.createCollider(RAPIER.ColliderDesc.trimesh(vertices,new Uint32Array([0,2,1,1,2,3])));
  world.createCollider(RAPIER.ColliderDesc.cuboid(.8,2,.3).setTranslation(0,2,-2));world.step();
  const from={x:0,y:DRONE_HEIGHT,z:0},to={x:0,y:DRONE_HEIGHT,z:-4};
  const path=droneDetour(from,to,(x,z)=>{const hit=world.castRay(new RAPIER.Ray({x,y:5,z},{x:0,y:-1,z:0}),10,true);return hit?5-hit.timeOfImpact+DRONE_HEIGHT:undefined;},(a,b)=>{const d={x:b.x-a.x,y:b.y-a.y,z:b.z-a.z};return droneMotion(world,a,d).length()>=Math.hypot(d.x,d.y,d.z)-.02;});
  assert.ok(path.points.length>1);for(const p of path.points)assert.ok(Math.abs(p.y-(p.x*.1+DRONE_HEIGHT))<1e-5);assert.ok(path.sweeps<=DETOUR_SWEEPS);
  const noFloor=droneDetour(from,to,()=>undefined,()=>false);assert.deepEqual(noFloor.points,[]);assert.ok(noFloor.samples<=80);
  for(const goal of [{...to,x:NaN},{...to,z:-100}])assert.deepEqual(droneDetour(from,goal,()=>{throw Error('must not sample');},()=>{throw Error('must not query');}).points,[]);
  const f=new DroneFollow();f.follow(to);assert.equal(f.reroute(Array.from({length:257},()=>to)),false);assert.equal(f.reroute([{...to,x:NaN}]),false);assert.equal(f.reroute([{...to,z:-3}]),false);assert.equal(f.reroute(path.points),true);path.points[0].x=900;assert.notEqual(f.target()!.x,900);
 }finally{world.free();}
});
