import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mapPoint,mapUV,surfacePin,PIN_LIMIT} from '../src/survey-map';
import {missionDestination} from '../src/navigation';
import {freshProgress} from '../src/state';
import {SURFACE_ORIGIN} from '../src/excursion';
test('north-up map round trips local coordinates and clamps pins inside the perimeter',()=>{
 for(const p of [{x:-37,z:-32},{x:40,z:-39},{x:0,z:23.5}]){const uv=mapUV(p.x,p.z),pin=mapPoint(uv.u,uv.v)!;assert.ok(Math.abs(pin.x-p.x)<1e-9&&Math.abs(pin.z-p.z)<1e-9);}
 assert.equal(mapPoint(.5,0)!.z,-PIN_LIMIT);assert.deepEqual(mapPoint(2,-1),{x:PIN_LIMIT,z:-PIN_LIMIT});assert.equal(surfacePin(NaN,1),undefined);
});
test('surface pins use local coordinates, stay optional and cannot override ship recovery',()=>{
 const p=freshProgress(),pin={x:-25,z:15},goal=missionDestination(p,true,pin);assert.equal(goal.id,'surface-pin');assert.equal(goal.x,SURFACE_ORIGIN-25);assert.equal(goal.z,15);
 assert.equal(missionDestination({...p,power:{...p.power,tripped:true}},false,pin).id,'diagnostics');assert.equal(missionDestination(p,true,{x:NaN,z:0}).id,'sample');assert.equal(missionDestination(p,true,{x:64,z:0}).id,'sample');assert.equal(missionDestination(p,true).id,'sample');assert.equal(p.surveyed,false);
});
