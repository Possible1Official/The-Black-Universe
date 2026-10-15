import {test} from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {SupplyCartridges} from '../src/supply-cartridges';
const visible=(display:SupplyCartridges)=>display.root.children.filter(slot=>slot.visible).length;
test('late shared import never restores consumed slots; repeated loading does not duplicate stock',async()=>{
 let finish!:()=>void,calls=0;const gate=new Promise<void>(resolve=>finish=resolve),display=new SupplyCartridges(async slot=>{calls++;await gate;slot.children[0].visible=false;slot.add(new THREE.Group());slot.userData.requested='canister';});
 display.setCount(2);const pending=display.load();assert.equal(display.load(),pending);display.setCount(1);finish();await pending;assert.equal(visible(display),1);assert.equal(calls,2);assert.ok(display.loaded);assert.equal(display.root.children[1].visible,false);
 display.setCount(0);await display.load(true);assert.equal(visible(display),0);assert.equal(calls,2);display.setCount(2);assert.equal(visible(display),2);assert.equal(display.root.children[0].children.length,2);
});
test('empty racks skip transfer; failed import retains usable slots and retries only explicitly',async()=>{
 let calls=0,fail=true;const display=new SupplyCartridges(async slot=>{calls++;if(fail)throw Error('QA unavailable');slot.children[0].visible=false;slot.add(new THREE.Group());slot.userData.requested='canister';});
 display.setCount(0);await display.load();assert.equal(calls,0);display.setCount(2);await display.load();assert.equal(calls,2);assert.equal(visible(display),2);assert.ok(display.root.children.every(s=>s.children[0].visible));await display.load();assert.equal(calls,2,'no retry loop per render frame');fail=false;await display.load(true);assert.ok(display.loaded);assert.equal(calls,4);display.setCount(0);assert.equal(visible(display),0);
});
