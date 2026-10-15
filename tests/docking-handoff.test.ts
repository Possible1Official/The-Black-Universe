import {test} from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {capturePosition,captureLook,EREBUS_CAPTURE,DOCKING_SECONDS,startFlight,canApproach} from '../src/flight';
import {LaunchBay,LAUNCH_BAY} from '../src/launch-bay';import {SHUTTLE_EYE_HEIGHT} from '../src/shuttle';import {stationContains} from '../src/station';
test('orbital capture eye, body and heading match the actual local return jet before door motion',()=>{
 const bay=new LaunchBay(false);assert.ok(bay.state.beginReturn());bay.sync();
 const eye=bay.jet.position.clone().add(new THREE.Vector3(0,SHUTTLE_EYE_HEIGHT,0)),end=capturePosition({x:12,y:1,z:-90},'erebus',DOCKING_SECONDS);
 assert.deepEqual([end.x,end.y,end.z],eye.toArray());assert.equal(end.z,LAUNCH_BAY.returnZ);
 const body=new THREE.Vector3(end.x,end.y-SHUTTLE_EYE_HEIGHT,end.z);assert.ok(body.distanceTo(bay.jet.position)<1e-12);
 const look=captureLook(end,'erebus');assert.equal(look.pitch,0);assert.ok(Math.abs(Math.atan2(Math.sin(look.yaw-bay.state.jetYaw),Math.cos(look.yaw-bay.state.jetYaw)))<1e-12);
 const near=capturePosition({x:12,y:1,z:-90},'erebus',DOCKING_SECONDS-1/600);assert.ok(eye.distanceTo(new THREE.Vector3(near.x,near.y,near.z))*600<.03,'guided translation settles before the stationary local handoff');
 end.x=99;assert.equal(EREBUS_CAPTURE.x,0,'return a fresh endpoint, not the shared constant');
});
test('front and interior captures withdraw/alight outside the closed local space door without crossing orbital hulls',()=>{
 for(const start of [{x:85,y:25,z:-80},{x:-80,y:-8,z:-40},{x:35,y:8,z:-37},{x:19,y:1.49,z:30},{x:-19,y:-1.49,z:0},{x:0,y:0,z:-50}]){
  assert.ok(canApproach({...startFlight('erebus'),phase:'flying',position:start}));
  const original=JSON.stringify(start);for(let i=0;i<=300;i++){const p=capturePosition(start,'erebus',i/60);assert.equal(stationContains(p),false);assert.ok(Object.values(p).every(Number.isFinite));if(i>=180)assert.ok(p.z<LAUNCH_BAY.outerZ-3.4,'final alignment stays wholly outside the still-closed local door');}
  assert.equal(JSON.stringify(start),original);assert.deepEqual(capturePosition(start,'erebus',10),EREBUS_CAPTURE);
 }
});
