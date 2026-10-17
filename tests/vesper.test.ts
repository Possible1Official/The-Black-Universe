import {test} from 'node:test';import assert from 'node:assert/strict';import RAPIER from '@dimforge/rapier3d-compat';
import {VESPER,VESPER_RADIUS,VESPER_APPROACH,VESPER_SITES,vesperBlock,vesperCapture,vesperMesh,vesperHeight} from '../src/vesper';
import {VesperSurface} from '../src/vesper-surface';import {startFlight,stepFlight} from '../src/flight';import {freshProgress,parseProgress} from '../src/state';
import * as THREE from 'three';import {orbitalCameraDistance} from '../src/view-camera';import {ROCK_HULL_VERTICES} from '../src/rock-hull';import {signalVisible} from '../src/orbital-signal';import {WAYFINDER} from '../src/orbital-layout';

test('Vesper landing guards reject locked, fast, embedded and remote craft; globe is a physical obstacle',()=>{
 const f={...startFlight('nysa'),phase:'flying' as const,position:{...VESPER_APPROACH}};
 assert.equal(vesperBlock(f,true),null);assert.match(vesperBlock(f,false)!,/Archive05/);assert.match(vesperBlock({...f,velocity:{x:19,y:0,z:0}},true)!,/Brake/);assert.ok(vesperBlock({...f,position:{...VESPER}},true));assert.ok(vesperBlock({...f,position:{x:0,y:0,z:0}},true));assert.ok(vesperBlock({...f,position:{...VESPER_APPROACH,x:NaN}},true));
 const hit=stepFlight({...f,position:{...VESPER,z:VESPER.z+99}}, {yaw:0,pitch:0,throttle:0,brake:false,boost:false},1/60);assert.equal(hit.collisions,1);assert.ok(Math.hypot(hit.position.x-VESPER.x,hit.position.y-VESPER.y,hit.position.z-VESPER.z)>=VESPER_RADIUS+8);
 for(const from of [{...VESPER_APPROACH,x:VESPER.x+80},{...VESPER_APPROACH,y:VESPER.y+90}])for(let i=0;i<=180;i++){const p=vesperCapture(from,i/60);assert.ok(Math.hypot(p.x-VESPER.x,p.y-VESPER.y,p.z-VESPER.z)>=100-1e-8);}
});
test('additive Vesper saves gate both readings and archive on valid prior discovery, preserve older objectives',()=>{
 const old=freshProgress(),p={...old,relays:['engineering','navigation','observatory'],forged:true,network:{repairs:['dune','basalt'],online:true},vault:{calibrated:true,archived:true},signalRecovered:true,salvage:'loaded',droneRecovered:true,vesperReadings:['ice','vent','ice','garbage'],vesperArchived:true};
 const parsed=parseProgress(JSON.stringify(p));assert.deepEqual(parsed.vesperReadings,['ice','vent']);assert.equal(parsed.vesperArchived,true);assert.equal(parsed.salvage,'loaded');assert.equal(parsed.droneRecovered,true);
 assert.deepEqual(parseProgress(JSON.stringify({...p,signalRecovered:false})).vesperReadings,[]);assert.equal(parseProgress(JSON.stringify({...p,vesperReadings:['ice']})).vesperArchived,false);assert.deepEqual(parseProgress(JSON.stringify({...p,vesperReadings:null})).vesperReadings,[]);assert.deepEqual(parseProgress(JSON.stringify(old)).vesperReadings,[]);
});
test('frozen basin mesh matches physics, central route is walkable, jump and stage timing remain bounded',async()=>{
 await RAPIER.init();const s=new VesperSurface();s.load=()=>undefined;
 try{
  const mesh=vesperMesh();assert.equal(mesh.indices.length,96*96*6);for(const p of [VESPER_SITES[0],VESPER_SITES[1],{x:0,z:22},{x:1,z:-28}]){const hit=s.world.castRay(new RAPIER.Ray({x:p.x,y:20,z:p.z},{x:0,y:-1,z:0}),30,true,undefined,undefined,undefined,undefined,c=>c.handle===s.terrain.handle);assert.ok(hit);assert.ok(Math.abs(20-hit.timeOfImpact-vesperHeight(p.x,p.z))<.02,'actual rendered mesh and terrain collision agree');}
  s.arrive(VESPER_APPROACH,[],false);for(let i=0;i<600;i++)s.step(1/60,{x:0,z:0,yaw:0,run:false,jump:false});assert.equal(s.phase,'walking');
  for(let i=0;i<1100;i++)s.step(1/60,{x:0,z:-1,yaw:0,run:false,jump:false});assert.ok(s.player.translation().z< -6,'walk clears apron and central basin lane');assert.ok(s.player.translation().y>vesperHeight(s.player.translation().x,s.player.translation().z)+.7);
  const initial=s.player.translation().y;let peak=initial;for(let i=0;i<90;i++){s.step(1/60,{x:0,z:0,yaw:0,run:false,jump:i===0});peak=Math.max(peak,s.player.translation().y);}assert.ok(peak>initial+.5);assert.ok(s.controller.computedGrounded());
  const before=s.snapshot();s.step(NaN,{x:0,z:0,yaw:0,run:false,jump:false});assert.deepEqual(s.snapshot(),before);
  s.step(1/60,{x:1,z:0,yaw:0,run:true,jump:false});s.clearMotion();const stopped=s.step(1/60,{x:0,z:0,yaw:0,run:false,jump:false});assert.ok(stopped.distance<.0001,'input cleanup removes drift, allowing microscopic floor projection');
 }finally{s.world.free();}
});
test('actual E interactions require proximity and clear sight, archive needs both readings, shuttle exits in stages',async()=>{
 await RAPIER.init();const s=new VesperSurface();s.load=()=>undefined;s.phase='walking';
 const place=(x:number,z:number)=>{const p={x,y:vesperHeight(x,z)+.9,z};s.player.setTranslation(p,true);s.player.setNextKinematicTranslation(p);s.world.step();};
 try{
  assert.equal(s.interact(0,0),null);place(1,-26.2);assert.match(s.interact(0,-.1)!.message,/Record/);
  for(const point of VESPER_SITES){place(point.x,point.z+1.8);assert.equal(s.interact(0,-.2)?.reading,point.id);}
  s.setProgress(['ice','vent'],false);place(1,-26.2);assert.equal(s.interact(0,-.1)?.archive,true);
  const wall=s.world.createCollider(RAPIER.ColliderDesc.cuboid(1,2,.1).setTranslation(1,2,-27));s.world.step();assert.equal(s.interact(0,-.1),null);s.world.removeCollider(wall,true);
  place(0,27);assert.match(s.interact(0,-.2)!.message,/ascent/);assert.equal(s.phase,'ascent');for(let i=0;i<600;i++)s.step(1/60,{x:0,z:0,yaw:0,run:false,jump:false});assert.equal(s.phase,'done');
 }finally{s.world.free();}
});
test('Vesper rocks use buried broad supports, distant rim faces upward, globe clips chase cameras and receiver sight',async()=>{
 await RAPIER.init();const s=new VesperSurface();try{
  const rocks=s.rocks.root.children[0] as THREE.InstancedMesh,m=new THREE.Matrix4(),p=new THREE.Vector3();assert.ok(rocks.count>12&&rocks.count<=32);
  for(let i=0;i<rocks.count;i++){rocks.getMatrixAt(i,m);let buried=0;for(let j=0;j<ROCK_HULL_VERTICES.length;j+=3){p.fromArray(ROCK_HULL_VERTICES,j).applyMatrix4(m);if(p.y<=vesperHeight(p.x,p.z)+.015)buried++;}assert.ok(buried>=6,'multiple base supports are embedded, not a balanced tip');}
  const rim=s.scene.getObjectByName('Distant Vesper crater rim') as THREE.Mesh,normal=rim.geometry.getAttribute('normal');assert.equal(rim.geometry.index!.count,2304);for(let i=0;i<normal.count;i++)assert.ok(normal.getY(i)>0,'rim faces visible sky');
  const from=new THREE.Vector3(VESPER.x,VESPER.y,VESPER.z+100),to=new THREE.Vector3(VESPER.x,VESPER.y,VESPER.z);assert.ok(orbitalCameraDistance(from,to)<8);
  const delta=new THREE.Vector3(VESPER.x-WAYFINDER.x,VESPER.y-WAYFINDER.y,VESPER.z-WAYFINDER.z).normalize().multiplyScalar(200);assert.equal(signalVisible({x:VESPER.x+delta.x,y:VESPER.y+delta.y,z:VESPER.z+delta.z}),false);
 }finally{s.world.free();}
});
