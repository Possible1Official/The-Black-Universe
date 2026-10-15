import {test} from 'node:test';import assert from 'node:assert/strict';import {LaunchInterlock,LAUNCH_BAY,LaunchBay} from '../src/launch-bay';import RAPIER from '@dimforge/rapier3d-compat';
test('boarding interlock seals the station before opening space and moving the parked jet',()=>{
 const s=new LaunchInterlock();assert.equal(s.jetZ,LAUNCH_BAY.parkZ);s.requestAccess();for(let i=0;i<60;i++)s.step(1/60);assert.equal(s.inner,1);assert.equal(s.outer,0);assert.ok(s.board());const phases=new Set([s.phase]);let moved=false;
 for(let i=0;i<600;i++){s.step(1/60);phases.add(s.phase);assert.ok(s.inner===0||s.outer===0,'doors must never expose station to space');if(s.jetZ!==LAUNCH_BAY.parkZ){moved=true;assert.equal(s.outer,1);assert.equal(s.inner,0);}if(s.boarded)assert.equal(s.requestAccess(),false);}
 assert.ok(moved);assert.equal(s.phase,'away');assert.equal(s.jetZ,LAUNCH_BAY.endZ);assert.deepEqual([...phases],['sealing','opening','departing','away']);s.reset();assert.deepEqual(s.snapshot(),new LaunchInterlock().snapshot());
});
test('occupied inner door delays sealing; zero dt freezes all launch motion',()=>{
 const s=new LaunchInterlock();s.requestAccess();for(let i=0;i<60;i++)s.step(1/60);s.board();for(let i=0;i<120;i++)s.step(1/60,true);assert.equal(s.phase,'sealing');assert.equal(s.inner,1);assert.equal(s.outer,0);const paused=s.snapshot();for(let i=0;i<100;i++)s.step(0);assert.deepEqual(s.snapshot(),paused);for(let i=0;i<60;i++)s.step(1/60);assert.equal(s.phase,'opening');
});
test('bay doors and jet hull share rendered transforms, retract and reset safely',async()=>{await RAPIER.init();const world=new RAPIER.World({x:0,y:-9.81,z:0});try{const bay=new LaunchBay(false);bay.init(world);bay.sync();world.step();assert.equal(bay.inner.position.z,LAUNCH_BAY.innerZ);assert.equal(bay.outer.position.z,LAUNCH_BAY.outerZ);assert.ok(bay.hull?.isEnabled());bay.state.requestAccess();for(let i=0;i<60;i++)bay.state.step(1/60);bay.state.board();bay.sync();assert.equal(bay.hull?.isEnabled(),false);for(let i=0;i<600;i++)bay.state.step(1/60);bay.sync();assert.equal(bay.jet.visible,false);assert.ok(bay.outer.position.y>8);bay.state.reset();bay.sync();assert.equal(bay.jet.visible,true);assert.equal(bay.jet.position.z,LAUNCH_BAY.parkZ);assert.ok(bay.hull?.isEnabled());}finally{world.free();}});

test('boarding an already sealed bay remains valid and still waits for the outer door',()=>{const s=new LaunchInterlock();assert.ok(s.board());assert.equal(s.outer,0);s.step(1/60);assert.equal(s.phase,'opening');assert.equal(s.jetZ,LAUNCH_BAY.parkZ);});

test('return turns outside the opening, parks, seals outer door and only then opens station access',()=>{
 const s=new LaunchInterlock();s.inner=1;s.access=true;assert.ok(s.beginReturn());const phases=new Set([s.phase]);let parking=false;
 for(let i=0;i<1000;i++){
  const z=s.jetZ;s.step(1/60);phases.add(s.phase);assert.ok(s.inner===0||s.outer===0,'return must never connect station directly to space');
  if(s.phase==='return-turn'){
   const yaw=s.jetYaw,halfWidth=4.94/2,halfLength=6.64/2,front=s.jetZ+Math.abs(Math.sin(yaw))*halfWidth+Math.abs(Math.cos(yaw))*halfLength;
   assert.ok(front<LAUNCH_BAY.outerZ-.5,'full turning footprint must stay outside aperture');assert.equal(s.outer,1);
  }
  if(s.jetZ>z){parking=true;assert.equal(s.outer,1);assert.equal(s.inner,0);assert.equal(s.jetYaw,0);}
  if(s.phase==='return-closing'||s.phase==='return-access'){assert.equal(s.jetZ,LAUNCH_BAY.parkZ);assert.equal(s.jetYaw,0);}
  if(s.inner>0&&s.phase!=='return-sealing'){assert.equal(s.outer,0);assert.equal(s.jetZ,LAUNCH_BAY.parkZ);}
 }
 assert.ok(parking);assert.equal(s.phase,'arrived');assert.equal(s.outer,0);assert.equal(s.inner,1);assert.ok(phases.has('return-opening')&&phases.has('return-turn')&&phases.has('return-parking')&&phases.has('return-closing')&&phases.has('return-access'));assert.ok(s.disembark());assert.equal(s.phase,'parked');assert.equal(s.access,true);assert.ok(s.board(),'returned craft can depart again');
});
test('return from an open outer bay preserves interlock; each phase can freeze and reset',()=>{
 const s=new LaunchInterlock();s.outer=1;s.phase='away';assert.ok(s.beginReturn());const seen=new Set<string>();
 for(let i=0;i<1000;i++){s.step(1/60);if(!seen.has(s.phase)){seen.add(s.phase);const paused=s.snapshot();for(let j=0;j<20;j++)s.step(0);assert.deepEqual(s.snapshot(),paused);if(s.boarded){assert.equal(s.board(),false);assert.equal(s.requestAccess(),false);assert.equal(s.beginReturn(),false);}}assert.ok(s.inner===0||s.outer===0);}
 s.reset();assert.deepEqual(s.snapshot(),new LaunchInterlock().snapshot());
 for(const phase of ['return-turn','return-parking','return-closing','return-access'] as const){s.phase=phase;s.outer=.4;s.jetYaw=.2;s.jetZ=-40;s.reset();assert.deepEqual(s.snapshot(),new LaunchInterlock().snapshot());}
});
test('return reinstates the parked solid hull only after disembarking with both leaves safe',async()=>{
 await RAPIER.init();const world=new RAPIER.World({x:0,y:-9.81,z:0});try{const bay=new LaunchBay(false);bay.init(world);bay.state.beginReturn();bay.sync();assert.equal(bay.hull?.isEnabled(),false);for(let i=0;i<1000;i++)bay.state.step(1/60);bay.sync();assert.equal(bay.hull?.isEnabled(),false);assert.equal(bay.jet.position.z,LAUNCH_BAY.parkZ);assert.equal(bay.jet.rotation.y,0);assert.equal(bay.outer.position.y,2.7);bay.state.disembark();bay.sync();assert.equal(bay.hull?.isEnabled(),true);assert.equal(bay.inner.position.y,5.7);}finally{world.free();}
});
