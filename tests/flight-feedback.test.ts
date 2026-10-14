import {test} from 'node:test';
import assert from 'node:assert/strict';
import {startFlight} from '../src/flight';
import {enginePower,FlightFeedback} from '../src/flight-feedback';
test('engine feedback follows thrust, boost and brake priority rather than coasting velocity',()=>{
 const f={...startFlight('nysa'),phase:'flying' as const,throttle:.8,velocity:{x:0,y:0,z:-90}};
 assert.equal(enginePower(f,false,false),.52);assert.equal(enginePower(f,false,true),.8);assert.equal(enginePower(f,true,true),0);assert.equal(enginePower({...f,throttle:0},false,false),0);
 assert.ok(enginePower({...f,phase:'ascending'},false,false)>enginePower({...f,phase:'descending'},false,false));assert.equal(enginePower({...f,phase:'landed'},false,false),0);
});
test('banking is bounded, handles yaw wrap, levels during capture and freezes at zero dt',()=>{
 const f={...startFlight('nysa'),phase:'flying' as const,throttle:1},fx=new FlightFeedback();fx.reset(Math.PI-.01);fx.step(f,-Math.PI+.01,false,false,1/60);assert.ok(fx.bank>0&&fx.bank<.03);
 for(let i=0;i<60;i++)fx.step(f,-Math.PI+.01+i*.1,false,false,1/60);assert.ok(fx.bank>=-.22&&fx.bank<=.22);const before={...fx};fx.step(f,0,true,true,0);assert.deepEqual({...fx},before);
 for(let i=0;i<60;i++)fx.step({...f,phase:'docking'},0,false,false,1/60);assert.ok(Math.abs(fx.bank)<.001);fx.reset(0);assert.equal(fx.bank,0);assert.equal(fx.time,0);
});
