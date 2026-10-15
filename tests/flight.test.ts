import {test} from 'node:test';
import assert from 'node:assert/strict';
import {startFlight,stepFlight,beginApproach,canApproach,flightDistance,flightSpeed,EREBUS_CAPTURE,NYSA_CENTER,NYSA_RADIUS,SURFACE_FLIGHT_SECONDS,surfaceFlightPose,cloudOpacity,type FlightInput,type FlightState} from '../src/flight';
import {FixedFrameClock} from '../src/timing';
const input:FlightInput={throttle:0,boost:false,brake:false,yaw:0,pitch:0};
const steps=(state:FlightState,n:number,controls=input)=>{for(let i=0;i<n;i++)state=stepFlight(state,controls,1/60);return state;};
test('both takeoff legs clear their origin, are immutable and start under manual control',()=>{
  for(const leg of ['nysa','erebus'] as const){const f=startFlight(leg),saved=JSON.stringify(f),next=steps(f,leg==='nysa'?181:602);assert.equal(next.phase,'flying');assert.equal(flightSpeed(next),0);assert.equal(next.position.z,leg==='nysa'?-80:-980);assert.equal(JSON.stringify(f),saved);assert.equal(stepFlight(f,input,NaN),f);}
});
test('manual thrust, boost and braking reach Nysa; approach guards prevent remote or fast landing',()=>{
  let f=steps(startFlight('nysa'),181);assert.equal(beginApproach(f),f);
  f=steps(f,120,{...input,throttle:1,boost:true});assert.ok(flightSpeed(f)>100);
  while(flightDistance(f)>85)f=stepFlight(f,{...input,throttle:1},1/60);
  assert.equal(canApproach(f),false);assert.equal(beginApproach(f),f);
  f=steps(f,120,{...input,brake:true});assert.ok(flightSpeed(f)<1);assert.ok(canApproach(f));
  f=steps(beginApproach(f),181);assert.equal(f.phase,'descending');f=steps(f,421);assert.equal(f.phase,'landed');assert.ok(Math.abs(f.position.z+1022)<.01);
});
test('surface takeoff permits manual return and guided docking without creating saved state',()=>{
  let f=steps(startFlight('erebus'),602);
  while(flightDistance(f)>85)f=stepFlight(f,{...input,throttle:1,yaw:Math.PI},1/60);
  f=steps(f,120,{...input,brake:true,yaw:Math.PI});assert.ok(canApproach(f));
  f=steps(beginApproach(f),301);assert.equal(f.phase,'docked');assert.deepEqual(f.position,EREBUS_CAPTURE);
});
test('surface descent/ascent are bounded, reversible and pause at the same physical camera pose',()=>{
  let last=Infinity;
  for(let i=0;i<=420;i++){const t=i/60,down=surfaceFlightPose(t),up=surfaceFlightPose(SURFACE_FLIGHT_SECONDS-t,true);assert.ok(down.altitude<=last+1e-9);assert.ok(down.altitude>=0&&down.altitude<=46);assert.ok(Math.abs(down.position.x-up.position.x)<1e-9);assert.ok(Math.abs(down.position.y-up.position.y)<1e-9);assert.ok(down.position.z>=19.1&&down.position.z<=29);assert.ok(Number.isFinite(down.pitch)&&Number.isFinite(down.yaw));last=down.altitude;}
  assert.equal(surfaceFlightPose(7).altitude,0);assert.equal(surfaceFlightPose(0,true).altitude,0);
  const f=steps(startFlight('erebus'),100),saved=JSON.stringify(f);assert.equal(f.phase,'ascending');assert.equal(stepFlight(f,input,0),f);assert.equal(JSON.stringify(f),saved);
});
test('cloud handoffs cover representation switches and clear at ground/orbital endpoints',()=>{
  let f={...startFlight('nysa'),phase:'landing' as const,timer:3};assert.ok(Math.abs(cloudOpacity(f)-.96)<1e-9);
  assert.equal(cloudOpacity({...f,phase:'descending',timer:0}),.96);assert.equal(cloudOpacity({...f,phase:'descending',timer:1}),0);
  assert.ok(Math.abs(cloudOpacity({...f,phase:'ascending',timer:7})-.96)<1e-9);
  assert.equal(cloudOpacity({...f,phase:'launching',leg:'erebus',timer:0}),.96);assert.equal(cloudOpacity({...f,phase:'flying'}),0);
});
test('planet/hull collisions and sector recovery cut thrust without NaNs or planet penetration',()=>{
  let f=steps(startFlight('nysa'),181);
  f=steps(f,1200,{...input,throttle:1,boost:true});assert.ok(f.collisions>0);assert.ok(Math.hypot(f.position.x-NYSA_CENTER.x,f.position.y,f.position.z-NYSA_CENTER.z)>=NYSA_RADIUS+8-.001);
  f={...f,position:{x:2400,y:0,z:0}};f=stepFlight(f,input,1/60);assert.equal(flightDistance(f),0);assert.equal(flightSpeed(f),0);
});
test('steering affects all spatial axes while fixed-step partitions preserve travel',()=>{
  const f=steps(startFlight('nysa'),181),a=steps(f,120,{...input,throttle:1,yaw:-Math.PI/2,pitch:.5});assert.ok(a.position.x>30);assert.ok(a.position.y>10);
  for(const fps of [30,120]){const clock=new FixedFrameClock();let b=f;for(let frame=0;frame<fps*2;frame++){const budget=clock.advance(1/fps);b=steps(b,budget.steps,{...input,throttle:1,yaw:-Math.PI/2,pitch:.5});}assert.ok(Math.hypot(a.position.x-b.position.x,a.position.y-b.position.y,a.position.z-b.position.z)<1e-6);}
  assert.ok(flightSpeed(a)<=110);
});
