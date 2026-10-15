import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {walkingCamera,flightCamera,orbitalCameraDistance,surfaceCameraDistance} from '../src/view-camera';
import {stationContains,stationRecovery,STATION_ASSEMBLY} from '../src/station';

test('walking chase camera keeps a near-plane sphere clear of walls, excludes the player and restores distance',async()=>{
  await RAPIER.init();const world=new RAPIER.World({x:0,y:0,z:0});
  try{
    const player=world.createCollider(RAPIER.ColliderDesc.capsule(.55,.3).setTranslation(0,.9,0));
    const wall=world.createCollider(RAPIER.ColliderDesc.cuboid(4,3,.2).setTranslation(0,1.5,1.3));world.step();
    const eye=new THREE.Vector3(0,1.64,0),blocked=walkingCamera(world,eye,0,0,player);
    assert.ok(blocked.position.z<.88,'near-plane radius stays in front of the wall');assert.ok(blocked.distance>.5&&blocked.distance<1.2);
    world.removeCollider(wall,true);world.step();const clear=walkingCamera(world,eye,0,0,player);
    assert.ok(clear.distance>3);assert.equal(clear.target.z,-8);assert.deepEqual(eye.toArray(),[0,1.64,0]);
    for(const yaw of [0,Math.PI/2,Math.PI])for(const pitch of [-1.35,0,1.35]){
      const p=walkingCamera(world,eye,yaw,pitch,player);assert.ok([...p.position.toArray(),...p.target.toArray()].every(Number.isFinite));
    }
  }finally{world.free();}
});

test('flight chase camera rotates with the pilot and clears the hangar roof and planet',()=>{
  const origin=new THREE.Vector3(0,0,-65),rotation=new THREE.Euler(0,0,0,'YXZ');
  const pose=flightCamera(origin,rotation,orbitalCameraDistance);assert.ok(pose.distance>12);assert.ok(pose.position.z>origin.z);assert.ok(pose.target.z<origin.z);
  const turned=flightCamera(new THREE.Vector3(0,0,-200),new THREE.Euler(0,Math.PI,0,'YXZ'),orbitalCameraDistance);assert.ok(turned.position.z< -200);assert.ok(turned.target.z> -200);
  const underRoof=flightCamera(new THREE.Vector3(0,0,-20),new THREE.Euler(-1,0,0,'YXZ'),orbitalCameraDistance);assert.ok(underRoof.distance<13);assert.ok(underRoof.position.y<4.75,'camera radius clears the actual bay roof, not the larger craft envelope');
  const from=new THREE.Vector3(0,0,-1010),to=new THREE.Vector3(0,0,-1200);assert.ok(orbitalCameraDistance(from,to)<20,'camera cannot enter the planet sphere');
  const p={x:0,y:STATION_ASSEMBLY.position[1],z:10};assert.equal(stationContains(p),true);const recovered=stationRecovery(p)!;assert.equal(stationContains(recovered),false);
});

test('touchdown chase camera ignores its own parked proxy but still clears other obstacles',async()=>{
  await RAPIER.init();const world=new RAPIER.World({x:0,y:0,z:0});
  try{
    const craft=world.createCollider(RAPIER.ColliderDesc.cuboid(2.47,1.42,3.31).setTranslation(0,1.42,0));
    const observer=world.createCollider(RAPIER.ColliderDesc.capsule(.55,.3).setTranslation(-3.8,.9,2));
    const hatch=world.createCollider(RAPIER.ColliderDesc.cuboid(.16,1.2,.16).setTranslation(0,1.2,3.5));world.step();
    const from=new THREE.Vector3(0,2.25,-.9),to=new THREE.Vector3(0,5.6,12.1);
    assert.equal(world.castRay(new RAPIER.Ray(from,to.clone().sub(from).normalize()),20,true)?.timeOfImpact,0,'solid parked proxy would collapse camera at touchdown');
    assert.equal(surfaceCameraDistance(world,from,to,observer,craft,hatch),from.distanceTo(to));
    world.createCollider(RAPIER.ColliderDesc.cuboid(3,3,.2).setTranslation(0,3,7));world.step();
    const distance=surfaceCameraDistance(world,from,to,observer,craft,hatch);assert.ok(distance>7&&distance<9);
  }finally{world.free();}
});

test('mounted chase view clears grazing rocks and doorway edges with its full camera volume',async()=>{
  await RAPIER.init();const world=new RAPIER.World({x:0,y:0,z:0});
  try{
    const observer=world.createCollider(RAPIER.ColliderDesc.capsule(.55,.3).setTranslation(-3,.9,0));
    const craft=world.createCollider(RAPIER.ColliderDesc.cuboid(1,1,2).setTranslation(0,2,0));
    const from=new THREE.Vector3(0,2,0),to=new THREE.Vector3(0,2,10);
    for(const desc of [RAPIER.ColliderDesc.cuboid(.1,2,.15).setTranslation(.3,2,5),RAPIER.ColliderDesc.ball(.5).setTranslation(.65,2,5)]){
      const obstacle=world.createCollider(desc);world.step();
      const ray=world.castRay(new RAPIER.Ray(from,{x:0,y:0,z:1}),10,true,undefined,undefined,observer,undefined,c=>c.handle!==craft.handle);
      assert.equal(ray,null,'center ray misses this visible edge');
      const distance=surfaceCameraDistance(world,from,to,observer,craft);assert.ok(distance>4&&distance<5,'camera retracts before its edge enters the obstacle');
      const position=from.clone().lerp(to,distance/10);
      assert.equal(world.intersectionWithShape(position,{x:0,y:0,z:0,w:1},new RAPIER.Ball(.22),undefined,undefined,observer,undefined,c=>c.handle!==craft.handle),null,'camera volume remains outside solids');
      world.removeCollider(obstacle,true);
    }
    world.step();assert.equal(surfaceCameraDistance(world,from,to,observer,craft),10,'full view returns after the obstruction is removed');
  }finally{world.free();}
});

test('surface chase handles embedded starts and coincident endpoints without NaNs',async()=>{
  await RAPIER.init();const world=new RAPIER.World({x:0,y:0,z:0});
  try{
    const observer=world.createCollider(RAPIER.ColliderDesc.ball(.1).setTranslation(-3,0,0)),craft=world.createCollider(RAPIER.ColliderDesc.ball(.1).setTranslation(-4,0,0));
    world.createCollider(RAPIER.ColliderDesc.cuboid(.1,2,2).setTranslation(.2,2,0));world.step();
    const from=new THREE.Vector3(0,2,0);
    assert.equal(surfaceCameraDistance(world,from,from,observer,craft),0);
    assert.equal(surfaceCameraDistance(world,from,new THREE.Vector3(0,2,10),observer,craft),0,'do not sweep through a wall overlapping the camera origin');
  }finally{world.free();}
});
