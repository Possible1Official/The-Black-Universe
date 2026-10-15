import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {startFlight,stepFlight,canApproach,beginApproach,capturePosition,captureLook,EREBUS_CAPTURE,EREBUS_APPROACH,NYSA_CENTER,NYSA_RADIUS,NYSA_CAPTURE,DOCKING_SECONDS,type FlightState,type Vec3} from '../src/flight';
import {STATION_HULL,CRAFT_CLEARANCE,stationContains,stationRecovery,inDockingZone} from '../src/station';
import {createFlightScene} from '../src/flight-scene';
const f=(position:Vec3,leg:'nysa'|'erebus'='nysa'):FlightState=>({...startFlight(leg),phase:'flying',position,velocity:{x:0,y:0,z:0}});
const input={throttle:0,brake:true,boost:false,yaw:0,pitch:0};
test('orbital capture preserves the planet safety radius where the old straight chord failed',()=>{
  const r=NYSA_RADIUS+8+.01,angle=25*Math.PI/180,start={x:r*Math.sin(angle),y:0,z:NYSA_CENTER.z+r*Math.cos(angle)};
  assert.ok(canApproach(f(start)));assert.ok(Math.hypot(start.x/2,0,(start.z+NYSA_CAPTURE.z)/2-NYSA_CENTER.z)<NYSA_RADIUS+8,'old midpoint cuts safety margin');
  for(const radius of [r,220,250])for(let degrees=0;degrees<=25;degrees+=5)for(let azimuth=0;azimuth<360;azimuth+=45){
    const a=degrees*Math.PI/180,b=azimuth*Math.PI/180,p={x:radius*Math.sin(a)*Math.cos(b),y:radius*Math.sin(a)*Math.sin(b),z:NYSA_CENTER.z+radius*Math.cos(a)};if(!canApproach(f(p)))continue;
    const source=JSON.stringify(p);assert.deepEqual(capturePosition(p,'nysa',0),p);assert.deepEqual(capturePosition(p,'nysa',3),NYSA_CAPTURE);
    for(let i=0;i<=180;i++){const pose=capturePosition(p,'nysa',i/60);assert.ok(Math.hypot(pose.x,pose.y,pose.z-NYSA_CENTER.z)>=NYSA_RADIUS+8-1e-9);assert.ok(Object.values(pose).every(Number.isFinite));}
    assert.equal(JSON.stringify(p),source);
  }
});
test('frontal and interior docking routes remain outside every rendered clearance-inflated hull',()=>{
  for(const start of [{x:85,y:25,z:-80},{x:-80,y:-8,z:-40},{x:35,y:8,z:-37},{x:15,y:1,z:20},{x:0,y:0,z:-100}]){
    assert.ok(canApproach(f(start,'erebus')));let flight=beginApproach(f(start,'erebus'));
    for(let i=0;i<=300;i++){
      const p=capturePosition(start,'erebus',i/60);
      for(const b of STATION_HULL){const inside=[p.x,p.y,p.z].every((value,a)=>value>b.position[a]-b.size[a]/2-CRAFT_CLEARANCE&&value<b.position[a]+b.size[a]/2+CRAFT_CLEARANCE);assert.equal(inside,false);}
      if(i<300)flight=stepFlight(flight,input,1/60);
    }
    flight=stepFlight(flight,input,1/60);assert.equal(flight.phase,'docked');assert.deepEqual(flight.position,EREBUS_CAPTURE);
  }
  assert.deepEqual(capturePosition({x:80,y:8,z:-80},'erebus',3),EREBUS_APPROACH);assert.equal(DOCKING_SECONDS,5);
});
test('docking accepts the open bay/front zone and rejects nearby side/rear wall shortcuts',()=>{
  for(const p of [{x:0,y:0,z:-80},{x:0,y:0,z:0},{x:19,y:1,z:20}]){assert.equal(inDockingZone(p),true);assert.equal(canApproach(f(p,'erebus')),true);}
  for(const p of [{x:70,y:0,z:-20},{x:0,y:-30,z:0},{x:0,y:12,z:0},{x:28,y:0,z:-20}]){assert.equal(inDockingZone(p),false);assert.equal(canApproach(f(p,'erebus')),false);const previous=f(p,'erebus');assert.equal(beginApproach(previous),previous);}
  assert.equal(canApproach({...f({x:0,y:0,z:-80},'erebus'),velocity:{x:0,y:0,z:19}}),false);
});
test('manual flight enters the bay while wall and intersecting-hull recovery stays stable',()=>{
  let flight=f({x:0,y:0,z:-80},'erebus');
  for(let i=0;i<300&&flight.position.z<-30;i++)flight=stepFlight(flight,{...input,brake:false,throttle:1,yaw:Math.PI},1/60);
  assert.ok(flight.position.z> -36);assert.equal(flight.collisions,0);
  for(let i=0;i<120;i++)flight=stepFlight(flight,{...input,yaw:Math.PI},1/60);
  assert.equal(flight.collisions,0);assert.equal(canApproach(flight),true);
  for(const point of [{x:0,y:9,z:10},{x:30,y:10,z:50},{x:-33,y:-9,z:20}]){
    assert.equal(stationContains(point),true);const recovered=stationRecovery(point)!;assert.equal(stationContains(recovered),false);assert.equal(stationRecovery(recovered),null);
  }
  const hit=stepFlight({...f({x:0,y:1.49,z:-20},'erebus'),velocity:{x:0,y:120,z:0}},{...input,brake:false},1/60);assert.equal(hit.collisions,1);assert.ok(hit.position.y<=1.49+1e-9);
});
test('rendered station hulls match shared collision dimensions and capture view centers the destination',()=>{
  const camera=new THREE.PerspectiveCamera(68,1,.08,2500),world=createFlightScene(camera,new THREE.MeshStandardMaterial(),new THREE.Texture());
  const boxes=world.scene.children.flatMap(o=>o.children).filter(o=>o instanceof THREE.Mesh&&o.geometry instanceof THREE.BoxGeometry) as THREE.Mesh<THREE.BoxGeometry>[];
  for(const b of STATION_HULL)assert.ok(boxes.some(m=>m.position.x===b.position[0]&&m.position.y===b.position[1]&&m.position.z===b.position[2]&&m.geometry.parameters.width===b.size[0]&&m.geometry.parameters.height===b.size[1]&&m.geometry.parameters.depth===b.size[2]));
  for(const leg of ['nysa','erebus'] as const){const p=leg==='nysa'?{x:70,y:20,z:-1000}:{x:40,y:8,z:-100},look=captureLook(p,leg);camera.rotation.order='YXZ';camera.position.set(p.x,p.y,p.z);camera.rotation.set(look.pitch,look.yaw,0);camera.updateMatrixWorld();const target=(leg==='nysa'?new THREE.Vector3(0,0,-1200):new THREE.Vector3(0,EREBUS_CAPTURE.y,52)).project(camera);assert.ok(Math.abs(target.x)<1e-9&&Math.abs(target.y)<1e-9);}
});
