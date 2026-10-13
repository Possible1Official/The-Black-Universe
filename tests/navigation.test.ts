import {test} from 'node:test';
import assert from 'node:assert/strict';
import {missionDestination,routeWaypoint,navigationReading} from '../src/navigation';
import {freshProgress,activateRelay,activateForge,RELAYS} from '../src/state';
import {SURFACE_ORIGIN,SAMPLE,LANDING} from '../src/excursion';
test('guidance advances through mission and prioritizes power recovery without changing saves',()=>{
  let p=freshProgress();assert.equal(missionDestination(p,false).id,'navigation');
  p=activateRelay(p,'navigation');assert.equal(missionDestination(p,false).id,'engineering');
  p=activateRelay(p,'engineering');assert.equal(missionDestination(p,false).id,'observatory');
  p=activateRelay(p,'observatory');assert.equal(missionDestination(p,false).id,'forge');
  assert.equal(missionDestination({...p,power:{...p.power,profile:'cooling'}},false).id,'diagnostics');
  p=activateForge(p);assert.equal(missionDestination(p,false).id,'science');
  const saved=JSON.stringify(p);assert.equal(missionDestination({...p,power:{...p.power,tripped:true}},false).id,'diagnostics');
  assert.equal(JSON.stringify(p),saved);
});
test('surface guide switches from sample to extraction and never points back through space',()=>{
  const p={...freshProgress(),relays:RELAYS,forged:true};
  const sample=missionDestination(p,true);assert.equal(sample.id,'sample');assert.equal(sample.x,SURFACE_ORIGIN+SAMPLE.x);
  const extraction=missionDestination({...p,surveyed:true,power:{...p.power,tripped:true}},true);
  assert.equal(extraction.id,'extraction');assert.equal(extraction.x,SURFACE_ORIGIN);assert.equal(extraction.z,LANDING.z+2.4);
});
test('ship route traverses doorways and distinguishes both closed access panels',()=>{
  const p=activateRelay(freshProgress(),'navigation'),goal=missionDestination(p,false);
  assert.equal(routeWaypoint(goal,{x:0,z:-9},[false,false]).id,'Port-panel');
  assert.equal(routeWaypoint(goal,{x:0,z:-9},[true,false]).id,'Port-outside');
  assert.equal(routeWaypoint(goal,{x:-8.6,z:6},[true,false]).id,'Port-enter');
  assert.equal(routeWaypoint(goal,{x:-10,z:4.85},[true,false]).id,'Port-enter');
  assert.equal(routeWaypoint(goal,{x:-12,z:6},[true,false]).id,'engineering');
  const starboard=missionDestination(activateRelay(p,'engineering'),false);
  assert.equal(routeWaypoint(starboard,{x:-16,z:10},[true,false]).id,'Port-inside');
  assert.equal(routeWaypoint(starboard,{x:-13,z:6},[true,false]).id,'Port-exit');
  assert.equal(routeWaypoint(starboard,{x:-16,z:10},[false,false]).id,'Port-inside-panel');
  assert.equal(routeWaypoint(goal,{x:16,z:10},[true,false]).id,'Starboard-inside-panel');
  assert.equal(routeWaypoint(goal,{x:16,z:10},[true,true]).id,'Starboard-inside');
  assert.equal(routeWaypoint(starboard,{x:0,z:6},[false,false]).id,'Starboard-panel');
  assert.equal(routeWaypoint(starboard,{x:8.6,z:6},[false,true]).id,'Starboard-enter');
  assert.equal(routeWaypoint(starboard,{x:12,z:6},[false,true]).id,'observatory');
});
test('compass matches camera yaw, relative turns and angle wrap in every quadrant',()=>{
  const p={x:0,z:0};
  for(const [target,direction,turn] of [[{x:0,z:-10},'N','AHEAD'],[{x:10,z:0},'N','RIGHT'],[{x:-10,z:0},'N','LEFT'],[{x:0,z:10},'N','BEHIND']] as const){const r=navigationReading(p,0,target);assert.equal(r.direction,direction);assert.equal(r.turn,turn);assert.equal(r.distance,10);}
  const east=navigationReading(p,-Math.PI/2,{x:10,z:0});assert.equal(east.direction,'E');assert.equal(east.turn,'AHEAD');
  const west=navigationReading(p,Math.PI/2,{x:-10,z:0});assert.equal(west.direction,'W');assert.equal(west.turn,'AHEAD');
  for(const yaw of [-Math.PI*20,Math.PI*20,Math.PI*20+.03]){const r=navigationReading(p,yaw,{x:0,z:-10});assert.equal(r.turn,'AHEAD');assert.ok(r.heading>=0&&r.heading<360);assert.ok(Math.abs(r.relativeDegrees)<2);}
  assert.deepEqual(navigationReading(p,0,p),{distance:0,heading:0,direction:'N',relativeDegrees:0,turn:'AHEAD'});
});
