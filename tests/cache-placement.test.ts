import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cachePlacement,CACHE_SIZE} from '../src/cache-placement';
import {terrainMesh} from '../src/excursion';
import {terrainSampler} from '../src/vehicle-stance';
import {SUPPLY_CACHE} from '../src/supplies';
test('field cache pallet supports the actual sloped terrain inside the existing footprint',()=>{
 const ground=terrainSampler(terrainMesh().vertices),plan=cachePlacement(ground);
 assert.equal(CACHE_SIZE.width,1.25);assert.equal(CACHE_SIZE.depth,1);
 assert.ok(plan.palletHeight>.3&&plan.palletHeight<.7,'real cache site needs a level support rather than buried geometry');
 for(let x=-.625;x<=.625;x+=.125)for(let z=-.5;z<=.5;z+=.1){const h=ground(SUPPLY_CACHE.x+x,SUPPLY_CACHE.z+z);assert.ok(h<plan.base);assert.ok(h>plan.bottom);}
 assert.ok(Math.abs(plan.colliderY-plan.colliderHalfHeight-plan.bottom)<1e-9);
 assert.ok(Math.abs(plan.colliderY+plan.colliderHalfHeight-plan.base-CACHE_SIZE.height)<1e-9);
});
