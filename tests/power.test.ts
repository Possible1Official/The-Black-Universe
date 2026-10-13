import {test} from 'node:test';
import assert from 'node:assert/strict';
import {freshPower,stepPower,powerOutput,resetContainment,forgeReadiness,parsePower} from '../src/power';
import {parseProgress,activateForge,RELAYS} from '../src/state';
function run(profile:'balanced'|'genesis'|'cooling',seconds:number,p=freshPower()){
  let s={...p,profile};for(let i=0;i<seconds*60;i++)s=stepPower(s,3,1/60);return s;
}
test('balanced routing remains stable with all relays and supports genesis',()=>{
  const p=run('balanced',600);assert.ok(p.heat<39);assert.equal(p.tripped,false);assert.equal(forgeReadiness(p,3),null);
  assert.equal(forgeReadiness(p,2),'Restore all three power relays first.');
});
test('genesis boosts forge output at a thermal cost; a trip is latched and recoverable',()=>{
  assert.ok(powerOutput({...freshPower(),profile:'genesis'},3).forge>powerOutput(freshPower(),3).forge);
  const hot=run('genesis',30);assert.equal(hot.tripped,true);assert.equal(powerOutput(hot,3).forge,0);
  assert.equal(resetContainment(hot).tripped,true,'hot trip cannot reset');
  const cooled=run('cooling',15,hot);assert.ok(cooled.heat<40);assert.equal(cooled.tripped,true,'cooling does not clear trip automatically');
  const reset=resetContainment(cooled);assert.equal(reset.tripped,false);assert.equal(reset.profile,'balanced');
  assert.equal(forgeReadiness(reset,3),null);
});
test('cooling reduces heat but restricts forge bus; existing generated worlds survive trips',()=>{
  const p=run('cooling',5,{profile:'genesis',heat:85,tripped:false});assert.ok(p.heat<85);
  assert.match(forgeReadiness(p,3)!,/underpowered/);
  const game=parseProgress(JSON.stringify({version:2,relays:RELAYS,forged:true,power:{...p,tripped:true}}));
  assert.equal(activateForge(game).forged,true);
  assert.equal(activateForge({...game,forged:false}).forged,false);
});
test('thermal decay is consistent across step partitions in stable mode',()=>{
  const one=stepPower(freshPower(),3,1);let many=freshPower();for(let i=0;i<60;i++)many=stepPower(many,3,1/60);
  assert.ok(Math.abs(one.heat-many.heat)<1e-9);
  assert.deepEqual(stepPower(one,3,NaN),one);
});
test('save v1 migrates completed missions; malformed v2 power safely repairs only power state',()=>{
  const legacy=parseProgress(JSON.stringify({version:1,relays:RELAYS,forged:true}));
  assert.equal(legacy.version,2);assert.equal(legacy.forged,true);assert.deepEqual(legacy.power,freshPower());
  const repaired=parseProgress(JSON.stringify({...legacy,power:{profile:'invalid',heat:99,tripped:false}}));
  assert.equal(repaired.forged,true);assert.deepEqual(repaired.power,freshPower());
  assert.equal(parsePower({profile:'genesis',heat:99,tripped:false}).tripped,true);
});
