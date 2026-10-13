import {test} from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import {bulkheadPanels} from '../src/bulkheads';
import {clearSight} from '../src/visibility';
import {missionDestination,routeWaypoint} from '../src/navigation';
import {freshProgress} from '../src/state';

test('interior access is visible/reachable on both sides while the opposite panel remains occluded',async()=>{
  await RAPIER.init();
  for(const side of [-1,1]){
    const world=new RAPIER.World({x:0,y:0,z:0}),doorX=side*11,panels=bulkheadPanels(doorX);
    world.createCollider(RAPIER.ColliderDesc.cuboid(.2,2.75,10).setTranslation(doorX,2.5,-6));
    const colliders=panels.map(p=>world.createCollider(RAPIER.ColliderDesc.cuboid(.9,.55,.5).setTranslation(p.x,.55,p.z)));world.step();
    const inside={x:panels[1].x,y:1.64,z:4.85},inner={x:panels[1].x,y:1.1,z:3.2},outer={x:panels[0].x,y:1.1,z:3.2};
    assert.ok(Math.hypot(inside.x-inner.x,inside.y-inner.y,inside.z-inner.z)<2.65);
    assert.equal(clearSight(world,inside,inner,undefined,colliders[1]),true);
    assert.equal(clearSight(world,{x:panels[0].x,y:1.64,z:4.85},outer,undefined,colliders[0]),true);
    assert.equal(clearSight(world,{x:panels[1].x,y:1.64,z:4.05},outer,undefined,colliders[0]),false);
    const goal=side<0?{id:'science',label:'Science',hint:'',x:5,z:-11}:missionDestination(freshProgress(),false);
    const closed=routeWaypoint(goal,inside,[false,false]);assert.equal(closed.x,panels[1].x);assert.equal(closed.z,panels[1].z);assert.match(closed.id,/inside-panel$/);
    world.free();
  }
});

test('Rapier visitor reaches interior controls and traverses the opened bulkhead without new panel obstruction',async()=>{
  await RAPIER.init();
  for(const side of [-1,1]){
    const world=new RAPIER.World({x:0,y:-9.81,z:0});world.timestep=1/60;
    world.createCollider(RAPIER.ColliderDesc.cuboid(11,.15,19).setTranslation(0,-.15,3));
    world.createCollider(RAPIER.ColliderDesc.cuboid(4,.15,7).setTranslation(side*15,-.15,7));
    for(const [z,half] of [[-6,10],[15,7]])world.createCollider(RAPIER.ColliderDesc.cuboid(.2,2.75,half).setTranslation(side*11,2.5,z));
    const door=world.createCollider(RAPIER.ColliderDesc.cuboid(.14,1.6,1.95).setTranslation(side*11,1.6,6));
    for(const panel of bulkheadPanels(side*11))world.createCollider(RAPIER.ColliderDesc.cuboid(.9,.55,.5).setTranslation(panel.x,.55,panel.z));
    world.createCollider(RAPIER.ColliderDesc.cuboid(side<0?1.4:1.5,side<0?1.5:.35,side<0?1.4:1.5).setTranslation(side*15,side<0?1.5:.35,4));
    const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(side*15,.9,10));
    const collider=world.createCollider(RAPIER.ColliderDesc.capsule(.55,.3),body),controller=world.createCharacterController(.015);controller.enableSnapToGround(.2);controller.enableAutostep(.25,.2,true);
    let reached=0;
    for(const target of [{x:side*13,z:6},{x:side*12,z:4.85},{x:side*13,z:6},{x:side*8.6,z:6}]){
      if(reached===2){door.setTranslation({x:side*11,y:5.3,z:6});world.step();}
      for(let i=0;i<500;i++){
        const p=body.translation(),dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz);if(d<.08)break;
        const step=Math.min(d,3/60);controller.computeColliderMovement(collider,{x:dx/d*step,y:-.2/60,z:dz/d*step});const m=controller.computedMovement();body.setNextKinematicTranslation({x:p.x+m.x,y:p.y+m.y,z:p.z+m.z});world.step();
        assert.ok(body.translation().y>.85&&body.translation().y<1,'panel approach remains grounded');
      }
      assert.ok(Math.hypot(body.translation().x-target.x,body.translation().z-target.z)<.08,'interior controls and exit path remain reachable');reached++;
    }
    assert.ok(Math.abs(body.translation().x)<11);world.free();
  }
});
