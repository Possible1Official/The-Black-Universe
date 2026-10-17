import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TOUR_ROUTE,startTour,continueTour,cancelTour,planTour,recordTourMovement,tourLine,type TourState} from '../src/crew-tour';
import {freshPatrol} from '../src/patrol';
import {freshProgress} from '../src/state';

test('tour visits all five stations, waits for explicit continuation, then releases patrol',()=>{
 let tour:TourState|null=startTour(),position={x:.7,z:-9};const stops:string[]=[];
 for(let i=0;i<15000&&tour;i++){
  const p=planTour(tour,freshPatrol(),position,{x:position.x,z:position.z+2},1/60);tour=p.tour;
  position={x:position.x+p.displacement.x,z:position.z+p.displacement.z};
  if(tour?.phase==='stop'){
   stops.push(TOUR_ROUTE[tour.cursor].stop!);assert.deepEqual(p.displacement,{x:0,z:0});
   assert.equal(planTour(tour,freshPatrol(),position,{x:position.x,z:position.z+2},1/60).tour?.cursor,tour.cursor);
   assert.ok(tourLine(tour,freshProgress()).length>80);tour=continueTour(tour);
  }
 }
 assert.equal(tour,null);assert.deepEqual(stops,['bridge','forge','engineering','observatory','habitat']);assert.ok(Math.hypot(position.x-.7,position.z+9)<.12);
});
test('visitor gap, personal space and conversation hold without skipping route; obstruction never teleports',()=>{
 const t=startTour(),p={x:.7,z:-9},state=freshPatrol();
 for(const [visitor,speaking] of [[{x:20,z:20},false],[p,false],[{x:1,z:-7},true]] as const){const plan=planTour(t,state,p,visitor,1/60,speaking);assert.deepEqual(plan.displacement,{x:0,z:0});assert.equal(plan.tour?.cursor,0);}
 assert.deepEqual(t,startTour());assert.deepEqual(state,freshPatrol());
 let blocked=t;for(let i=0;i<180;i++)blocked=recordTourMovement(blocked,.01,0,1/60);
 assert.equal(blocked.blocked,2);assert.equal(blocked.cursor,0);assert.match(tourLine(blocked,freshProgress()),/obstructed/);
 assert.equal(recordTourMovement(blocked,.01,.01,1/60).blocked,0);
});
test('cancellation reverses traversed nodes, ignores stop lectures and is idempotent',()=>{
 for(const phase of ['walking','stop'] as const){
  let t:TourState|null=cancelTour({...startTour(),cursor:6,phase});const expected=phase==='walking'?5:6;
  assert.equal(t.cursor,expected);assert.deepEqual(cancelTour(t),t);
  let p={...TOUR_ROUTE[expected]},visited:number[]=[];
  for(let i=0;i<15000&&t;i++){
   const plan=planTour(t,freshPatrol(),p,{x:p.x,z:p.z+2},1/60);t=plan.tour;
   p={x:p.x+plan.displacement.x,z:p.z+plan.displacement.z};if(t&&!visited.includes(t.cursor))visited.push(t.cursor);
  }
  assert.equal(t,null);assert.ok(Math.hypot(p.x-TOUR_ROUTE[0].x,p.z-TOUR_ROUTE[0].z)<.12);assert.ok(visited.every((n,i)=>i===0||n<visited[i-1]));
 }
});
