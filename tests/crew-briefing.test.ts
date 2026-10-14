import {test} from 'node:test';
import assert from 'node:assert/strict';
import {crewBriefing} from '../src/crew-briefing';
import {activateForge,activateRelay,freshProgress,RELAYS,parseProgress,recordFieldScan} from '../src/state';
import {FIELD_SITES} from '../src/survey';
const ready=()=>activateForge(RELAYS.reduce(activateRelay,freshProgress()));
test('officers direct the next missing relay and architect rather than repeating completed work',()=>{
 let p=freshProgress();assert.match(crewBriefing('VEGA',p),/navigation console/);
 p=activateRelay(p,'navigation');assert.match(crewBriefing('VEGA',p),/Restore the engineering/);
 p=activateRelay(p,'engineering');assert.match(crewBriefing('VEGA',p),/observatory relay/);
 p=activateRelay(p,'observatory');assert.match(crewBriefing('VEGA',p),/All three relays.*architect/);
});
test('survey debrief discloses only recorded readings and survives save reload',()=>{
 let p=ready();assert.match(crewBriefing('VEGA',p,'survey'),/not yet collected.*0\/2/);
 assert.ok(!crewBriefing('VEGA',p,'survey').includes('17.4 Hz'));
 p={...recordFieldScan(p,'arch'),surveyed:true};
 const text=crewBriefing('VEGA',parseProgress(JSON.stringify(p)),'survey');
 assert.match(text,/secured.*1\/2/);assert.ok(text.includes(FIELD_SITES[0].reading));assert.ok(!text.includes(FIELD_SITES[1].reading));
 assert.match(crewBriefing('VEGA',p),/weather station is still unscanned/);
 p=recordFieldScan(p,'weather');assert.match(crewBriefing('VEGA',p),/Both survey readings are recorded/);
});
test('systems report actual routing and stock without claiming the officer changed either',()=>{
 const p=ready();p.power.profile='genesis';p.power.heat=80;p.supplies.coolant=0;
 const before=JSON.stringify(p),text=crewBriefing('ION',p,'systems');
 assert.match(text,/GENESIS.*80%.*reserve 0\/2/);assert.match(text,/switch to Cooling/);assert.match(text,/refill.*once/);
 assert.equal(JSON.stringify(p),before);assert.ok(!crewBriefing('ION',p).includes('rerouted'));
 p.supplies.cacheClaimed=true;assert.match(crewBriefing('ION',p,'systems'),/already recovered.*Cooling remains available/);
});
test('a latched trip overrides every topic and preserves created-world status',()=>{
 const p=ready();p.power.tripped=true;p.power.heat=39;p.supplies.coolant=1;
 for(const name of ['VEGA','ION'])for(const topic of ['mission','survey','systems'] as const){
  const text=crewBriefing(name,p,topic);assert.match(text,/tripped.*39%/);assert.match(text,/40% or less.*reset manually/);assert.match(text,/Reserve 1\/2/);assert.match(text,/does not clear the trip/);
 }
});
