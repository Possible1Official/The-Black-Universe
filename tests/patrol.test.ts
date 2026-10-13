import {test} from 'node:test';
import assert from 'node:assert/strict';
import {freshPatrol, planPatrol, recordPatrolMovement, turnToward} from '../src/patrol';
const route = [{x:0,z:0},{x:0,z:3}] as const;
const far = {x:10,z:10};
test('patrol reaches bounded endpoints, waits, then returns without overshoot',()=>{
  let p={x:0,z:1}, state=freshPatrol();
  for(let i=0;i<1200;i++) {
    const next=planPatrol(state,p,route,far,1/60);state=next.state;
    assert.ok(Math.hypot(next.displacement.x,next.displacement.z)<=.65/60+1e-9);
    p={x:p.x+next.displacement.x,z:p.z+next.displacement.z};
    assert.ok(p.z>=0 && p.z<=3);
  }
  assert.ok(p.z>.2 && p.z<2.8,'patrol continues after endpoint waits');
});
test('crew yields to nearby player and attends a conversation without losing route',()=>{
  const initial={...freshPatrol(),waypoint:1 as const};
  const yielded=planPatrol(initial,{x:0,z:1},route,{x:0,z:2},1/60);
  assert.equal(yielded.state.mode,'attending');assert.deepEqual(yielded.displacement,{x:0,z:0});
  const speaking=planPatrol(initial,{x:0,z:1},route,far,1/60,true);
  assert.equal(speaking.state.waypoint,1);assert.equal(speaking.state.mode,'attending');
  assert.equal(planPatrol(speaking.state,{x:0,z:1},route,far,1/60).state.mode,'patrolling');
});
test('sustained collision triggers route reversal; successful motion clears obstruction',()=>{
  let state=freshPatrol();for(let i=0;i<125;i++)state=recordPatrolMovement(state,.01,0,1/60);
  assert.equal(state.waypoint,1);assert.ok(state.wait>0);
  assert.equal(recordPatrolMovement({...state,blocked:1},.01,.009,1/60).blocked,0);
  assert.equal(recordPatrolMovement({...state,blocked:1},0,0,1/60).blocked,0);
});
test('turns take the shortest path across angle wrap and remain rate-limited',()=>{
  const start=Math.PI-.01, end=-Math.PI+.01;
  assert.ok(turnToward(start,end,1/60)>start);
  assert.ok(Math.abs(turnToward(0,Math.PI,1/60))<=2.4/60+1e-9);
});

test('attention hysteresis prevents stop/start chatter at the approach boundary',()=>{
  const attending={...freshPatrol(),mode:'attending' as const};
  const p={x:0,z:1};
  assert.equal(planPatrol(attending,p,route,{x:0,z:3},1/60).state.mode,'attending');
  assert.equal(planPatrol(attending,p,route,{x:0,z:3.3},1/60).state.mode,'patrolling');
});
