import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LANDING_PLAN,landingPad,terrainHeight,surfaceRocks,SURFACE_ORIGIN} from '../src/excursion';
import {startFlight,surfaceFlightPose,SURFACE_FLIGHT_SECONDS,stepFlight} from '../src/flight';
import {missionDestination} from '../src/navigation';
import {freshProgress} from '../src/state';
import {SHUTTLE_HATCH_Z} from '../src/shuttle';
test('all landing pads have flat ground and rock-free approach space',()=>{
 for(const pad of LANDING_PLAN){for(const [dx,dz] of [[0,0],[3,0],[0,3],[-2,-2]])assert.equal(terrainHeight(pad.x+dx,pad.z+dz),0);for(const rock of surfaceRocks())assert.ok(Math.hypot(rock.x-pad.x,rock.z-pad.z)>=6);}
});
test('site-specific lift preserves the original flight path shape and returns to the selected pad',()=>{
 for(const t of [0,1,3,SURFACE_FLIGHT_SECONDS]){const a=surfaceFlightPose(t,false,'survey'),b=surfaceFlightPose(t,false,'arch');assert.ok(Math.abs(b.position.x-a.position.x+34)<1e-8);assert.ok(Math.abs(b.position.z-a.position.z+35)<1e-8);assert.equal(b.altitude,a.altitude);assert.ok(Math.abs(b.yaw-a.yaw)<1e-8);}
 const f=startFlight('erebus','arch');assert.equal(f.site,'arch');assert.equal(stepFlight(f,{yaw:0,pitch:0,throttle:0,brake:false,boost:false},1/60).site,'arch');
 const p={...freshProgress(),surveyed:true},pad=landingPad('arch'),goal=missionDestination(p,true,undefined,'arch');assert.equal(goal.x,SURFACE_ORIGIN+pad.x);assert.equal(goal.z,pad.z+SHUTTLE_HATCH_Z);assert.equal(missionDestination({...p,surveyed:false},true,undefined,'arch').id,'sample');
});
