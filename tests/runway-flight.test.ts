import {test} from 'node:test';import assert from 'node:assert/strict';
import {startRunwayFlight,stepFlight,flightSpeed,MANUAL_CRUISE_SPEED} from '../src/flight';
import {LaunchInterlock} from '../src/launch-bay';
import {LAUNCH_BAY,LOCAL_JET_Y,RUNWAY_EXIT_SPEED,RUNWAY_DEPARTURE_SECONDS} from '../src/launch-layout';
import {SHUTTLE_EYE_HEIGHT} from '../src/shuttle';import {stationContains} from '../src/station';
const controls={throttle:0,brake:false,boost:false,yaw:0,pitch:0};
test('manual flight begins at the actual runway eye/body endpoint and terminal speed',()=>{
 const bay=new LaunchInterlock();bay.phase='departing';let before=bay.jetZ,dt=1/600;
 for(let i=0;i<Math.round(RUNWAY_DEPARTURE_SECONDS/dt);i++){before=bay.jetZ;bay.step(dt);}
 // Float rounding may leave one infinitesimal final interlock step.
 if(bay.phase!=='away')bay.step(dt);
 assert.equal(bay.phase,'away');const f=startRunwayFlight('arch');
 assert.deepEqual(f.position,{x:0,y:LOCAL_JET_Y+SHUTTLE_EYE_HEIGHT,z:bay.jetZ});assert.equal(f.position.z,LAUNCH_BAY.endZ);
 assert.ok(Math.abs(f.position.y-SHUTTLE_EYE_HEIGHT-LOCAL_JET_Y)<1e-12);assert.equal(f.site,'arch');assert.equal(f.phase,'flying');assert.equal(flightSpeed(f),RUNWAY_EXIT_SPEED);
 assert.ok(Math.abs(Math.abs(bay.jetZ-before)/dt-RUNWAY_EXIT_SPEED)<.004);assert.ok(Math.abs(f.throttle*MANUAL_CRUISE_SPEED-RUNWAY_EXIT_SPEED)<1e-9);assert.equal(stationContains(f.position),false);
 f.position.z--;assert.equal(f.start.z,LAUNCH_BAY.endZ,'spawn/start positions must not alias');
});
test('carried throttle holds exit speed without input, while brake still takes priority',()=>{
 let f=startRunwayFlight(),initial=JSON.stringify(f);assert.equal(stepFlight(f,controls,0),f);assert.equal(JSON.stringify(f),initial);
 for(let i=0;i<120;i++)f=stepFlight(f,{...controls,targetThrottle:f.throttle},1/60);
 assert.ok(Math.abs(flightSpeed(f)-RUNWAY_EXIT_SPEED)<1e-9);assert.ok(Math.abs(f.position.z-(LAUNCH_BAY.endZ-2*RUNWAY_EXIT_SPEED))<1e-8);assert.equal(f.collisions,0);
 for(let i=0;i<120;i++)f=stepFlight(f,{...controls,brake:true,boost:true,throttle:1,targetThrottle:1},1/60);
 assert.equal(f.throttle,0);assert.ok(flightSpeed(f)<.01);assert.equal(f.collisions,0);
});
