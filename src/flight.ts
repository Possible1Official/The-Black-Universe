// Bounded arcade flight, in sector meters; no gravity or arbitrary orbital mechanics.
import {inDockingZone,stationRecovery} from './station';
import {landingPad,type LandingSite} from './excursion';
import {LAUNCH_BAY,LOCAL_JET_Y,RUNWAY_EXIT_SPEED} from './launch-layout';
import {SHUTTLE_EYE_HEIGHT} from './shuttle';
import {WAYFINDER,WAYFINDER_HULL} from './orbital-layout';
export const MANUAL_CRUISE_SPEED=110;
export type Vec3={x:number;y:number;z:number};
export const NYSA_CENTER:Vec3={x:0,y:0,z:-1200};
export const NYSA_RADIUS=170;
export const NYSA_APPROACH:Vec3={x:0,y:0,z:-980};
export const EREBUS_APPROACH:Vec3={x:0,y:0,z:-65};
export const EREBUS_CAPTURE:Readonly<Vec3>={x:0,y:LOCAL_JET_Y+SHUTTLE_EYE_HEIGHT,z:LAUNCH_BAY.returnZ};
export const APPROACH_RANGE=100,SAFE_SPEED=18;
export const SURFACE_FLIGHT_SECONDS=7;
export const DOCKING_SECONDS=5;
export const NYSA_CAPTURE:Vec3={x:0,y:0,z:-1022};
export type FlightLeg='nysa'|'erebus';
export interface FlightState {leg:FlightLeg;site:LandingSite;phase:'launching'|'flying'|'landing'|'descending'|'ascending'|'docking'|'landed'|'docked';position:Vec3;velocity:Vec3;throttle:number;timer:number;collisions:number;start:Vec3;}
export interface FlightInput {targetThrottle?:number;throttle:number;brake:boolean;boost:boolean;yaw:number;pitch:number;}
const copy=(v:Vec3)=>({...v});
export const flightSpeed=(f:FlightState)=>Math.hypot(f.velocity.x,f.velocity.y,f.velocity.z);
export const flightGoal=(f:FlightState)=>f.leg==='nysa'?NYSA_APPROACH:EREBUS_APPROACH;
export const flightDistance=(f:FlightState)=>{const t=flightGoal(f),p=f.position;return Math.hypot(t.x-p.x,t.y-p.y,t.z-p.z);};
export function startFlight(leg:FlightLeg,site:LandingSite='survey'):FlightState {
  const position=leg==='nysa'?{x:0,y:0,z:-20}:copy(NYSA_CAPTURE);
  return {leg,site,phase:leg==='erebus'?'ascending':'launching',position,velocity:{x:0,y:0,z:0},throttle:0,timer:0,collisions:0,start:copy(position)};
}
// Match the quadratic runway path's endpoint derivative, not a stationary spawn.
export function startRunwayFlight(site:LandingSite='survey'):FlightState{
 const position={x:0,y:LOCAL_JET_Y+SHUTTLE_EYE_HEIGHT,z:LAUNCH_BAY.endZ};
 return {...startFlight('nysa',site),phase:'flying',position,start:copy(position),velocity:{x:0,y:0,z:-RUNWAY_EXIT_SPEED},throttle:RUNWAY_EXIT_SPEED/MANUAL_CRUISE_SPEED};
}
export function isSurfaceFlight(f:FlightState){return f.phase==='descending'||f.phase==='ascending';}
// Local survey coordinates; orbital and ground representations remain separate.
export function surfaceFlightPose(timer:number,ascending=false,site:LandingSite='survey'){
  const t=Math.max(0,Math.min(1,timer/SURFACE_FLIGHT_SECONDS)),ease=t*t*(3-2*t),height=ascending?ease:1-ease;
  const pad=landingPad(site);
  const position={x:pad.x-8*height,y:1.65+46*height,z:pad.z-.9+9.9*height};
  const yaw=-Math.atan2(pad.x-position.x,position.z-(pad.z-3));
  const pitch=-Math.atan2(position.y-1.65,Math.max(.001,Math.hypot(position.x-pad.x,position.z-(pad.z-3))));
  return {position,yaw,pitch,altitude:46*height,progress:t};
}
export function cloudOpacity(f:FlightState):number {
  if(f.phase==='landing')return Math.max(0,(f.timer-2.4)/.6)*.96;
  if(f.phase==='descending')return Math.max(0,1-f.timer/.7)*.96;
  if(f.phase==='ascending')return Math.max(0,(f.timer-(SURFACE_FLIGHT_SECONDS-.7))/.7)*.96;
  if(f.phase==='launching'&&f.leg==='erebus')return Math.max(0,1-f.timer/.6)*.96;
  return 0;
}
export function canApproach(f:FlightState){return f.phase==='flying'&&flightDistance(f)<=APPROACH_RANGE&&flightSpeed(f)<=SAFE_SPEED&&(f.leg==='nysa'?Math.hypot(f.position.x-NYSA_CENTER.x,f.position.y-NYSA_CENTER.y,f.position.z-NYSA_CENTER.z)>=NYSA_RADIUS+8-1e-6:inDockingZone(f.position));}
const smooth=(t:number)=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const lerpPoint=(a:Vec3,b:Vec3,t:number):Vec3=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
export function capturePosition(start:Vec3,leg:FlightLeg,seconds:number):Vec3 {
  if(seconds<=0)return copy(start);
  if(leg==='erebus'){
    const end=copy(EREBUS_CAPTURE);if(seconds>=DOCKING_SECONDS)return end;
    // Align outside before rising to the local seated eye. Interior approaches
    // withdraw through the clear center corridor instead of crossing the hull.
    const mouth=EREBUS_APPROACH;return seconds<=3?lerpPoint(start,mouth,smooth(seconds/3)):lerpPoint(mouth,end,smooth((seconds-3)/2));
  }
  if(seconds>=3)return copy(NYSA_CAPTURE);
  const t=smooth(seconds/3),delta={x:start.x-NYSA_CENTER.x,y:start.y-NYSA_CENTER.y,z:start.z-NYSA_CENTER.z},radius=Math.hypot(delta.x,delta.y,delta.z);
  const direction={x:(delta.x/radius)*(1-t),y:(delta.y/radius)*(1-t),z:(delta.z/radius)*(1-t)+t},length=Math.hypot(direction.x,direction.y,direction.z),r=Math.max(NYSA_RADIUS+8,radius+(NYSA_RADIUS+8-radius)*t);
  return {x:NYSA_CENTER.x+direction.x/length*r,y:NYSA_CENTER.y+direction.y/length*r,z:NYSA_CENTER.z+direction.z/length*r};
}
export function captureLook(position:Vec3,leg:FlightLeg){
  const target=leg==='nysa'?NYSA_CENTER:{x:0,y:EREBUS_CAPTURE.y,z:52},dx=target.x-position.x,dy=target.y-position.y,dz=target.z-position.z;
  return {yaw:Math.atan2(-dx,-dz),pitch:Math.atan2(dy,Math.hypot(dx,dz))};
}
export function beginApproach(f:FlightState):FlightState {
  return canApproach(f)?{...f,phase:f.leg==='nysa'?'landing':'docking',timer:0,throttle:0,velocity:{x:0,y:0,z:0},start:copy(f.position)}:f;
}
function advanceThrust(f:Pick<FlightState,'throttle'|'velocity'>,input:FlightInput,dt:number){
  // Brake wins over simultaneous joystick/throttle/boost intent.
  const throttle=input.brake?Math.max(0,f.throttle-dt*1.8):input.targetThrottle===undefined?Math.max(0,Math.min(1,f.throttle+Math.max(-1,Math.min(1,input.throttle))*dt*.7)):Math.max(0,Math.min(1,f.throttle+Math.max(-dt*.7,Math.min(dt*.7,Math.max(0,Math.min(1,input.targetThrottle))-f.throttle))));
  const speed=throttle*(input.boost&&!input.brake?180:MANUAL_CRUISE_SPEED),pitch=Math.max(-1.35,Math.min(1.35,input.pitch));
  const desired={x:-Math.sin(input.yaw)*Math.cos(pitch)*speed,y:Math.sin(pitch)*speed,z:-Math.cos(input.yaw)*Math.cos(pitch)*speed};
  const blend=1-Math.exp(-(input.brake?5:1.4)*dt),velocity=copy(f.velocity);
  for(const axis of ['x','y','z'] as const)velocity[axis]+=(desired[axis]-velocity[axis])*blend;
  return {throttle,velocity};
}
// Bounded 60 Hz forecast of held braking at the current heading; no hull avoidance.
export function brakePrediction(f:FlightState,yaw:number,pitch:number){
  let motion={throttle:f.throttle,velocity:copy(f.velocity)},steps=0;
  const displacement={x:0,y:0,z:0},dt=1/60,input={throttle:0,brake:true,boost:false,yaw,pitch};
  while(steps<300&&(motion.throttle>0||Math.hypot(motion.velocity.x,motion.velocity.y,motion.velocity.z)>.5)){
    motion=advanceThrust(motion,input,dt);for(const axis of ['x','y','z'] as const)displacement[axis]+=motion.velocity[axis]*dt;steps++;
  }
  return {displacement,steps,time:steps*dt,distance:Math.hypot(displacement.x,displacement.y,displacement.z)};
}
export function approachGuidance(f:FlightState,yaw:number,pitch:number,objective?:{target:Vec3;range:number;speed:number;ready:boolean}){
  const target=objective?.target??flightGoal(f),distance=Math.hypot(target.x-f.position.x,target.y-f.position.y,target.z-f.position.z),speed=flightSpeed(f),dx=(target.x-f.position.x)/Math.max(distance,.001),dy=(target.y-f.position.y)/Math.max(distance,.001),dz=(target.z-f.position.z)/Math.max(distance,.001);
  const closing=f.velocity.x*dx+f.velocity.y*dy+f.velocity.z*dz,lateral=Math.sqrt(Math.max(0,speed*speed-closing*closing));
  const stop=brakePrediction(f,yaw,pitch),stopToward=Math.max(0,stop.displacement.x*dx+stop.displacement.y*dy+stop.displacement.z*dz);
  return {closing,lateral,stop,ready:objective?.ready??canApproach(f),brakeNow:f.phase==='flying'&&speed>(objective?.speed??SAFE_SPEED)&&closing>5&&distance<=(objective?.range??APPROACH_RANGE)+stopToward+15,movingAway:closing< -5};
}
export function stepFlight(previous:FlightState,input:FlightInput,dt:number):FlightState {
  if(!Number.isFinite(dt)||dt<=0)return previous;
  dt=Math.min(dt,.05);
  const f={...previous,position:copy(previous.position),velocity:copy(previous.velocity),start:copy(previous.start)};
  if(f.phase!=='flying'){
    if(f.phase==='landed'||f.phase==='docked')return f;
    if(isSurfaceFlight(f)){
      f.timer=Math.min(SURFACE_FLIGHT_SECONDS,f.timer+dt);
      if(f.timer>=SURFACE_FLIGHT_SECONDS){f.phase=f.phase==='descending'?'landed':'launching';f.timer=0;f.start=copy(f.position);}
      return f;
    }
    const duration=f.phase==='docking'?DOCKING_SECONDS:3;f.timer=Math.min(duration,f.timer+dt);
    if(f.phase==='launching')f.position=lerpPoint(f.start,f.leg==='nysa'?{x:0,y:0,z:-80}:NYSA_APPROACH,smooth(f.timer/3));
    else f.position=capturePosition(f.start,f.leg,f.timer);
    if(f.timer>=duration){f.phase=f.phase==='launching'?'flying':f.phase==='landing'?'descending':'docked';if(f.phase==='descending')f.timer=0;}
    return f;
  }
  Object.assign(f,advanceThrust(f,input,dt));
  for(const axis of ['x','y','z'] as const)f.position[axis]+=f.velocity[axis]*dt;
  // At the fixed 60 Hz step, displacement is <=3 m, far below these hull radii.
  for(const [center,radius] of [[NYSA_CENTER,NYSA_RADIUS+8],[WAYFINDER,WAYFINDER_HULL]] as const){
    const p=f.position,dx=p.x-center.x,dy=p.y-center.y,dz=p.z-center.z,d=Math.hypot(dx,dy,dz);
    if(d<radius){const clearance=radius+.01,scale=clearance/Math.max(d,.001);p.x=center.x+dx*scale;p.y=center.y+dy*scale;p.z=center.z+(d>.001?dz*scale:clearance);f.velocity={x:0,y:0,z:0};f.throttle=0;f.collisions++;}
  }
  const recovery=stationRecovery(f.position);if(recovery){f.position=recovery;f.velocity={x:0,y:0,z:0};f.throttle=0;f.collisions++;}
  if(Math.hypot(f.position.x,f.position.y,f.position.z)>2300){f.position=copy(flightGoal(f));f.velocity={x:0,y:0,z:0};f.throttle=0;f.collisions++;}
  return f;
}
