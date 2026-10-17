import {test} from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import {modelFixture} from './asset-fixture';
import {meshColliders} from '../src/mesh-colliders';
import {TOUR_ROUTE,startTour,continueTour,cancelTour,planTour,recordTourMovement,type TourState} from '../src/crew-tour';
import {freshPatrol,turnToward} from '../src/patrol';
import {bulkheadPanels} from '../src/bulkheads';

test('actual packaged Intrepid geometry and solid terminals allow full tour and reverse cancellation',async()=>{
 await RAPIER.init();const world=new RAPIER.World({x:0,y:-9.81,z:0});world.timestep=1/60;
 meshColliders(world,(await modelFixture('interior')).scene);
 for(const [x,z] of [[-5,-5.7],[0,-13.5],[5,-5.7],[0,-17.2],[0,-10.5],[-6.2,-7.4],[0,4.4]])world.createCollider(RAPIER.ColliderDesc.cuboid(.9,.55,.5).setTranslation(x,.55,z));
 for(const x of [-2.625,2.625])for(const p of bulkheadPanels(x,-6.0375,1.25))world.createCollider(RAPIER.ColliderDesc.cuboid(.3,.55,.15).setTranslation(p.x,.55,p.z));
 const doors=[-2.625,2.625].map(x=>({x,open:false,fraction:0,collider:world.createCollider(RAPIER.ColliderDesc.cuboid(.14,1.6,.975).setTranslation(x,1.6,-6.0375))}));
 const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(.7,.94,-9)),collider=world.createCollider(RAPIER.ColliderDesc.capsule(.67,.24),body),controller=world.createCharacterController(.015);controller.enableSnapToGround(.2);controller.enableAutostep(.25,.2,true);world.step();
 const run=(cancelAt?:number)=>{
  let tour:TourState|null=startTour(),heading=0;const stops:number[]=[];
  for(let i=0;i<15000&&tour;i++){
   const p=body.translation(),plan=planTour(tour,freshPatrol(),p,{x:0,z:p.z+3},1/60);tour=plan.tour;
   if(tour?.phase==='stop'){stops.push(tour.cursor);tour=cancelAt===tour.cursor?cancelTour(tour):continueTour(tour);}
   for(const d of doors){if(Math.hypot(p.x-d.x,p.z+6.0375)<1.5)d.open=true;d.fraction+=(1-Math.exp(-5/60))*((d.open?1:0)-d.fraction);d.collider.setTranslation({x:d.x,y:1.6+d.fraction*3.7,z:-6.0375});}
   const dx=plan.facing.x-p.x,dz=plan.facing.z-p.z,goal=Math.atan2(dx,dz);heading=turnToward(heading,goal,1/60);const turn=Math.abs(Math.atan2(Math.sin(goal-heading),Math.cos(goal-heading)))>.3;
   const desired=turn?{x:0,z:0}:plan.displacement;controller.computeColliderMovement(collider,{...desired,y:-.2/60});const m=controller.computedMovement(),intended=Math.hypot(desired.x,desired.z),actual=intended?(m.x*desired.x+m.z*desired.z)/intended:0;
   if(tour){tour=recordTourMovement(tour,intended,actual,1/60);assert.ok(tour.blocked<2,`blocked at${JSON.stringify({p,tour})}`);}
   body.setNextKinematicTranslation({x:p.x+m.x,y:p.y+m.y,z:p.z+m.z});world.step();assert.ok(body.translation().y>.88&&body.translation().y<1.2,'grounded on original deck');
  }
  assert.equal(tour,null,'finite physical route finishes');return stops;
 };
 try{assert.deepEqual(run(),[1,2,6,8,10]);assert.ok(doors.every(d=>d.open));assert.deepEqual(run(6),[1,2,6]);assert.ok(Math.hypot(body.translation().x-TOUR_ROUTE[0].x,body.translation().z-TOUR_ROUTE[0].z)<.13);}finally{world.free();}
});
