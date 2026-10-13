import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ShipLightBudget} from '../src/light-budget';

function rig(){return Array.from({length:9},(_,i)=>{const light=new THREE.PointLight(i%2?0xffa763:0x79c9ed,20,12,2);light.position.set(i*10,4,0);return light;});}
const at=(x:number)=>new THREE.Vector3(x,1.7,0);

test('performance uses four nearby sources; high and surface visibility override travel snapshots',()=>{
  const sources=rig(),budget=new ShipLightBudget(sources);
  budget.configure(false,true);budget.update(at(0),0);
  assert.equal(budget.snapshot().visibleSources,0);assert.equal(budget.snapshot().visibleProxies,4);
  assert.deepEqual(budget.snapshot().slots.map(s=>s.source),[0,1,2,3]);
  budget.configure(true,true);assert.equal(budget.snapshot().visibleSources,9);assert.equal(budget.snapshot().visibleProxies,0);
  budget.configure(true,false);budget.configure(false,false);assert.equal(budget.snapshot().visibleSources+budget.snapshot().visibleProxies,0);
  // Travel can restore stale visibility; explicit policy must correct it.
  sources.forEach(l=>l.visible=true);budget.proxies.forEach(l=>l.visible=true);
  budget.configure(false,true);budget.update(at(80),0);
  assert.equal(budget.snapshot().visibleSources,0);assert.deepEqual(budget.snapshot().slots.map(s=>s.source),[8,7,6,5]);
});

test('handoff fades old source to zero before relocating and keeps four proxies visible',()=>{
  const budget=new ShipLightBudget(rig());budget.configure(false,true);budget.update(at(0),0);
  const position=budget.proxies[0].position.clone();
  budget.update(at(80),.075);
  assert.deepEqual(budget.proxies[0].position,position);assert.equal(budget.snapshot().slots[0].gain,.5);
  budget.update(at(80),.075);
  assert.notDeepEqual(budget.proxies[0].position,position);assert.equal(budget.proxies[0].intensity,0);
  budget.update(at(80),.15);assert.equal(budget.snapshot().slots[0].gain,1);assert.equal(budget.snapshot().visibleProxies,4);
});

test('selection is stable across small boundary movements and follows live power/color uniforms',()=>{
  const sources=rig(),budget=new ShipLightBudget(sources,1);budget.configure(false,true);budget.update(at(5),0);
  assert.equal(budget.snapshot().slots[0].source,0);
  budget.update(at(5.05),.05);assert.equal(budget.snapshot().slots[0].pending,-1);
  sources[0].intensity=3;sources[0].color.setHex(0xff0000);sources[0].distance=25;sources[0].decay=1.4;
  budget.update(at(0),.15);
  assert.equal(budget.proxies[0].intensity,3);assert.equal(budget.proxies[0].color.getHex(),0xff0000);
  assert.equal(budget.proxies[0].distance,25);assert.equal(budget.proxies[0].decay,1.4);
});

test('retained ranks do not shuffle slots; interrupted fades do not duplicate sources',()=>{
  const budget=new ShipLightBudget(rig());budget.configure(false,true);budget.update(at(0),0);
  budget.update(at(10),.1);assert.equal(budget.snapshot().slots[0].source,0);
  budget.update(at(80),.05);budget.update(at(0),.05);
  budget.update(at(0),.3);
  const slots=budget.snapshot().slots;
  assert.equal(new Set(slots.map(s=>s.source)).size,4);assert.ok(slots.every(s=>s.pending===-1&&s.gain===1));
});

test('repeated interrupted room crossings settle to distinct slots with bounded light gains',()=>{
  const budget=new ShipLightBudget(rig());budget.configure(false,true);budget.update(at(0),0);
  for(let i=0;i<100;i++){
    budget.update(at((i*37)%81),.017);
    const slots=budget.snapshot().slots;
    assert.equal(new Set(slots.map(s=>s.source)).size,4);
    assert.ok(slots.every(s=>s.gain>=0&&s.gain<=1));
  }
  budget.update(at(80),.3);
  const slots=budget.snapshot().slots;
  assert.equal(new Set(slots.map(s=>s.source)).size,4);assert.ok(slots.every(s=>s.pending<0&&s.gain===1));
});
