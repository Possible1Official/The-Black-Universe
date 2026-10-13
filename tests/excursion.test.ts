import {test} from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import {terrainMesh,terrainHeight,LANDING,SAMPLE,SITE_HALF,landingBlock} from '../src/excursion';
import {freshProgress,parseProgress,RELAYS} from '../src/state';
test('survey terrain is deterministic, bounded, upward-facing and flat at landing',()=>{
  const a=terrainMesh(),b=terrainMesh();assert.deepEqual(a,b);
  assert.equal(terrainHeight(LANDING.x,LANDING.z),0);
  assert.ok(Math.abs(terrainHeight(SAMPLE.x,SAMPLE.z))<2);
  for(const index of a.indices)assert.ok(index<a.vertices.length/3);
  for(let i=0;i<a.vertices.length;i+=3){assert.ok(Math.abs(a.vertices[i])<=SITE_HALF);assert.ok(Math.abs(a.vertices[i+2])<=SITE_HALF);assert.ok(Number.isFinite(a.vertices[i+1]));}
  for(let i=0;i<a.indices.length;i+=3){const [p,q,r]=Array.from(a.indices.slice(i,i+3)).map(n=>n*3);const upward=(a.vertices[q+2]-a.vertices[p+2])*(a.vertices[r]-a.vertices[p])-(a.vertices[q]-a.vertices[p])*(a.vertices[r+2]-a.vertices[p+2]);assert.ok(upward>0);}
});
test('Rapier capsule walks rendered survey terrain without sinking or falling',async()=>{
  await RAPIER.init();const world=new RAPIER.World({x:0,y:-9.81,z:0});world.timestep=1/60;
  const mesh=terrainMesh();world.createCollider(RAPIER.ColliderDesc.trimesh(mesh.vertices,mesh.indices));
  const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,1.05,20));
  const capsule=world.createCollider(RAPIER.ColliderDesc.capsule(.55,.3),body),controller=world.createCharacterController(.015);
  controller.enableSnapToGround(.2);controller.enableAutostep(.25,.2,true);controller.setMaxSlopeClimbAngle(Math.PI/4);
  let groundedSteps=0,verticalSpeed=0;
  for(let i=0;i<640;i++){
    const p=body.translation();verticalSpeed=controller.computedGrounded()?-.2:verticalSpeed-9.81/60;controller.computeColliderMovement(capsule,{x:9/640,y:verticalSpeed/60,z:-29/640});
    const m=controller.computedMovement();body.setNextKinematicTranslation({x:p.x+m.x,y:p.y+m.y,z:p.z+m.z});world.step();
    const after=body.translation();assert.ok(after.y>terrainHeight(after.x,after.z)+.78,'capsule bottom stays above visible ground');
    if(controller.computedGrounded())groundedSteps++;
  }
  assert.ok(groundedSteps>600);assert.ok(Math.abs(body.translation().x-SAMPLE.x)<.5);assert.ok(Math.abs(body.translation().z-SAMPLE.z)<.5);world.free();
});
test('landing gates and survey saves preserve legacy progression and reject impossible samples',()=>{
  assert.match(landingBlock(false,false)!,/Create Nysa/);assert.match(landingBlock(true,true)!,/Containment/);assert.equal(landingBlock(true,false),null);
  const complete={...freshProgress(),relays:RELAYS,forged:true,surveyed:true};assert.deepEqual(parseProgress(JSON.stringify(complete)),complete);
  assert.equal(parseProgress(JSON.stringify({...complete,forged:false})).surveyed,false);
  assert.equal(parseProgress(JSON.stringify({...complete,surveyed:'true'})).surveyed,false);
  const old={version:2,relays:RELAYS,forged:true,power:complete.power};assert.equal(parseProgress(JSON.stringify(old)).forged,true);assert.equal(parseProgress(JSON.stringify(old)).surveyed,false);
});
