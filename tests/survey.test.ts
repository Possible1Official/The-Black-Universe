import {test} from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import {FIELD_SITES} from '../src/survey';
import {freshProgress,parseProgress,recordFieldScan,RELAYS} from '../src/state';
import {missionDestination} from '../src/navigation';
import {createSurface} from '../src/surface';
import {terrainHeight,LANDING,SAMPLE,SURFACE_ORIGIN,SITE_HALF} from '../src/excursion';
import {clearSight} from '../src/visibility';

test('optional scans preserve sample/mission, sanitize additive saves and reject pre-genesis discovery',()=>{
  const fresh=freshProgress();assert.equal(recordFieldScan(fresh,'arch'),fresh);
  let p={...fresh,relays:RELAYS,forged:true,surveyed:true};const before=JSON.stringify(p);
  p=recordFieldScan(p,'weather');assert.equal(JSON.stringify({...p,fieldScans:[]}),before);
  assert.equal(recordFieldScan(p,'weather'),p);p=recordFieldScan(p,'arch');assert.deepEqual(parseProgress(JSON.stringify(p)),p);
  assert.deepEqual(parseProgress(JSON.stringify({...p,fieldScans:['arch','unknown',42,'arch','weather',null]})).fieldScans,['arch','weather']);
  for(const value of ['arch',null,{},false])assert.deepEqual(parseProgress(JSON.stringify({...p,fieldScans:value})).fieldScans,[]);
  assert.deepEqual(parseProgress(JSON.stringify({...p,forged:false})).fieldScans,[]);
  const {fieldScans,...old}=p;assert.deepEqual(parseProgress(JSON.stringify(old)).fieldScans,[]);assert.equal(parseProgress(JSON.stringify(old)).surveyed,true);
  assert.deepEqual(freshProgress().fieldScans,[]);
});
test('field tracking overrides only surface guidance and falls back after a scan or clearing',()=>{
  const p={...freshProgress(),relays:RELAYS,forged:true,surveyed:true};
  for(const site of FIELD_SITES){const waypoint=missionDestination(p,true,site.id);assert.equal(waypoint.id,`field-${site.id}`);assert.equal(waypoint.x,SURFACE_ORIGIN+site.x);assert.equal(waypoint.z,site.z);assert.equal(missionDestination(p,false,site.id).id,'science');assert.equal(missionDestination(recordFieldScan(p,site.id),true,site.id).id,'extraction');}
  assert.equal(missionDestination(p,true).id,'extraction');assert.equal(missionDestination({...p,surveyed:false},true).id,'sample');
});
test('expanded terrain routes reach both rendered scanners through real Rapier and reject pillar sight',async()=>{
  await RAPIER.init();const surface=createSurface(),world=new RAPIER.World({x:0,y:-9.81,z:0});world.timestep=1/60;
  try{
    assert.equal(SITE_HALF,64);assert.equal(surface.mesh.indices.length/3,18432);assert.equal(surface.mesh.vertices.length/3,9409);
    assert.ok(surface.obstacles.length<=128);assert.equal(surface.landmarkBoxes.length,5);assert.equal(surface.scanners.length,2);
    world.createCollider(RAPIER.ColliderDesc.trimesh(surface.mesh.vertices,surface.mesh.indices));
    for(const r of surface.obstacles)world.createCollider(RAPIER.ColliderDesc.ball(r.radius).setTranslation(r.x-SURFACE_ORIGIN,r.y,r.z));
    for(const b of surface.landmarkBoxes)world.createCollider(RAPIER.ColliderDesc.cuboid(b.size[0]/2,b.size[1]/2,b.size[2]/2).setTranslation(b.x,b.y,b.z));
    const scanners=surface.scanners.map(s=>world.createCollider(RAPIER.ColliderDesc.cuboid(s.size[0]/2,s.size[1]/2,s.size[2]/2).setTranslation(s.position.x-SURFACE_ORIGIN,s.position.y-.45,s.position.z)));
    const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(-3.8,1.05,22)),capsule=world.createCollider(RAPIER.ColliderDesc.capsule(.55,.3),body),controller=world.createCharacterController(.015);
    controller.enableSnapToGround(.2);controller.enableAutostep(.25,.2,true);controller.setMaxSlopeClimbAngle(Math.PI/4);let verticalSpeed=0,grounded=0,total=0;
    const walk=(goal:{x:number;z:number})=>{
      for(let n=0;n<2500;n++){
        const p=body.translation(),dx=goal.x-p.x,dz=goal.z-p.z,distance=Math.hypot(dx,dz);if(distance<.15)return;
        verticalSpeed=controller.computedGrounded()?-.2:verticalSpeed-9.81/60;
        controller.computeColliderMovement(capsule,{x:dx/distance*Math.min(.05,distance),y:verticalSpeed/60,z:dz/distance*Math.min(.05,distance)});
        const m=controller.computedMovement();body.setNextKinematicTranslation({x:p.x+m.x,y:p.y+m.y,z:p.z+m.z});world.step();
        assert.ok(body.translation().y>terrainHeight(body.translation().x,body.translation().z)+.77);total++;if(controller.computedGrounded())grounded++;
      }assert.fail(`Blocked route to ${JSON.stringify(goal)} at ${JSON.stringify(body.translation())}`);
    };
    walk({x:SAMPLE.x,z:SAMPLE.z+3.4});
    for(const [i,site] of FIELD_SITES.entries()){
      walk({x:site.x,z:site.z+3.4});const p=body.translation(),anchor={x:site.x,y:surface.scanners[i].position.y,z:site.z+1.4};
      assert.ok(Math.hypot(p.x-anchor.x,p.y+.74-anchor.y,p.z-anchor.z)<2.65);assert.equal(clearSight(world,{x:p.x,y:p.y+.74,z:p.z},anchor,capsule,scanners[i]),true);
    }
    walk({x:LANDING.x-3.8,z:LANDING.z+2});assert.ok(grounded/total>.95);
    const arch=FIELD_SITES[0],base=terrainHeight(arch.x,arch.z);assert.equal(clearSight(world,{x:arch.x-5,y:base+1.65,z:arch.z},{x:arch.x,y:base+.9,z:arch.z+1.4},undefined,scanners[0]),false);
    // Scanner color changes reuse resources, and reset restores the unrecorded state.
    surface.setScans(['arch','weather']);assert.ok(surface.scanners.every(s=>s.material.emissiveIntensity===1.8));surface.setScans([]);assert.ok(surface.scanners.every(s=>s.material.emissiveIntensity===.6));
  }finally{world.free();}
});
