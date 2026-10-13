import {test} from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import {FixedFrameClock,FIXED_STEP,MAX_STEPS,JUMP_BUFFER_SECONDS,stepJumpBuffer} from '../src/timing';
test('fixed clock preserves simulation time across 120, 60, 30, 10 and 4 FPS partitions',()=>{
  for(const fps of [120,60,30,10,4]){const clock=new FixedFrameClock();let steps=0;for(let frame=0;frame<fps*10;frame++){const budget=clock.advance(1/fps);assert.ok(budget.steps<=MAX_STEPS);assert.ok(budget.remainder>=0&&budget.remainder<FIXED_STEP);assert.equal(budget.dropped,0);steps+=budget.steps;}assert.equal(steps,600,`10 seconds at ${fps} FPS`);}
});
test('stall catch-up is bounded; reset and invalid deltas cannot bank movement',()=>{
  const clock=new FixedFrameClock();clock.advance(FIXED_STEP/2);const stalled=clock.advance(100);assert.equal(stalled.steps,15);assert.equal(stalled.dropped,99.75);
  clock.reset();assert.deepEqual(clock.advance(0),{steps:0,remainder:0,dropped:0});
  for(const invalid of [NaN,Infinity,-Infinity,-1])assert.equal(clock.advance(invalid).steps,0);
  assert.equal(clock.advance(FIXED_STEP/2).steps,0);clock.reset();assert.equal(clock.advance(FIXED_STEP/2).steps,0);
});
test('Rapier walking, jumping and wall collision stay consistent at low render rates',async()=>{
  await RAPIER.init();
  function run(fps:number){
    const world=new RAPIER.World({x:0,y:-9.81,z:0});world.timestep=FIXED_STEP;
    world.createCollider(RAPIER.ColliderDesc.cuboid(10,.15,20).setTranslation(0,-.15,0));
    world.createCollider(RAPIER.ColliderDesc.cuboid(10,3,.1).setTranslation(0,3,-2));
    const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,.9,5));
    const collider=world.createCollider(RAPIER.ColliderDesc.capsule(.55,.3),body),controller=world.createCharacterController(.015);
    controller.enableAutostep(.25,.2,true);controller.enableSnapToGround(.2);
    const clock=new FixedFrameClock();let step=0,speed=0,vertical=0,peak=0;
    for(let frame=0;frame<fps*3;frame++)for(let i=0,n=clock.advance(1/fps).steps;i<n;i++){
      speed+=(3-speed)*(1-Math.exp(-12*FIXED_STEP));
      vertical=controller.computedGrounded()?-.2:vertical-9.81*FIXED_STEP;
      if(step===30&&controller.computedGrounded())vertical=4.2;
      controller.computeColliderMovement(collider,{x:0,y:vertical*FIXED_STEP,z:-speed*FIXED_STEP});
      const p=body.translation(),m=controller.computedMovement();body.setNextKinematicTranslation({x:p.x+m.x,y:p.y+m.y,z:p.z+m.z});world.step();step++;
      const after=body.translation();peak=Math.max(peak,after.y);assert.ok(after.y>=.84,'floor supports capsule');assert.ok(after.z>=-1.6,'wall never tunnels');
    }
    const result={...body.translation(),peak,step};world.free();return result;
  }
  const baseline=run(60);assert.ok(baseline.peak>1.7,'jump has full ballistic height');assert.ok(baseline.z< -1.5,'player reaches wall');
  for(const fps of [120,30,10,4])assert.deepEqual(run(fps),baseline,`same physical result at ${fps} FPS`);
});

test('short jump taps survive key release between frames; airborne intent expires',()=>{
  let buffer=JUMP_BUFFER_SECONDS; // Key-up does not erase the queued press.
  const grounded=stepJumpBuffer(buffer,true);assert.equal(grounded.jump,true);assert.equal(grounded.remaining,0);assert.equal(stepJumpBuffer(grounded.remaining,true).jump,false);
  for(let i=0;i<13;i++){const result=stepJumpBuffer(buffer,false);assert.equal(result.jump,false);buffer=result.remaining;}
  assert.equal(buffer,0);assert.equal(stepJumpBuffer(buffer,true).jump,false);
  assert.equal(stepJumpBuffer(0,true).jump,false,'cleared modal/pause buffer cannot jump');
});
