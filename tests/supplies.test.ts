import {test} from 'node:test';
import assert from 'node:assert/strict';
import {freshSupplies,dischargeCoolant,coolantBlock,recoverSupplies,parseSupplies} from '../src/supplies';
import {freshProgress,parseProgress,RELAYS} from '../src/state';
test('finite coolant removes heat without clearing the containment latch or changing routing',()=>{
  const original={profile:'genesis' as const,heat:96,tripped:true},supplies=freshSupplies();
  const first=dischargeCoolant(original,supplies);assert.equal(first.power.heat,71);assert.equal(first.power.tripped,true);assert.equal(first.power.profile,'genesis');assert.equal(first.supplies.coolant,1);
  const second=dischargeCoolant(first.power,first.supplies);assert.equal(second.power.heat,46);assert.equal(second.supplies.coolant,0);
  assert.equal(dischargeCoolant(second.power,second.supplies).used,false);assert.equal(original.heat,96);assert.equal(supplies.coolant,2);
  const safe={profile:'cooling' as const,heat:40,tripped:true};assert.ok(coolantBlock(safe,supplies));assert.equal(dischargeCoolant(safe,supplies).supplies,supplies);
});
test('world supply cache is one-time, bounded and preserves old mission saves',()=>{
  const empty={coolant:0,cacheClaimed:false};assert.equal(recoverSupplies(empty,false),empty);
  const full=freshSupplies();assert.equal(recoverSupplies(full,true),full,'full reserves must not waste the one-time cache');
  const recovered=recoverSupplies(empty,true);assert.deepEqual(recovered,{coolant:2,cacheClaimed:true});assert.equal(recoverSupplies({...recovered,coolant:0},true).coolant,0);
  const old={version:2,relays:RELAYS,forged:true,surveyed:true,fieldScans:['arch','weather']};const migrated=parseProgress(JSON.stringify(old));assert.deepEqual(migrated.supplies,freshSupplies());assert.equal(migrated.surveyed,true);
  const spent={...migrated,supplies:{coolant:0,cacheClaimed:true}};assert.deepEqual(parseProgress(JSON.stringify(spent)),spent);
  for(const coolant of [-1,3,NaN,1.5,'2'])assert.equal(parseSupplies({coolant,cacheClaimed:true},false).coolant,2);
  assert.deepEqual(parseProgress(JSON.stringify({...freshProgress(),supplies:{coolant:1,cacheClaimed:true}})).supplies,{coolant:1,cacheClaimed:false});
});
test('cache tracking is optional, switches back after recovery, and never overrides ship recovery',async()=>{
  const {missionDestination}=await import('../src/navigation');
  const p={...freshProgress(),relays:RELAYS,forged:true,supplies:{coolant:0,cacheClaimed:false}};
  const goal=missionDestination(p,true,'supplies');assert.equal(goal.id,'supplies');assert.equal(goal.z,-21);
  assert.equal(missionDestination({...p,supplies:recoverSupplies(p.supplies,true)},true,'supplies').id,'sample');
  assert.equal(missionDestination({...p,power:{...p.power,tripped:true}},false,'supplies').id,'diagnostics');
});
