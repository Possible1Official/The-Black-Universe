// Bounded arcade flight, in sector meters; no gravity or arbitrary orbital mechanics.
export type Vec3={x:number;y:number;z:number};
export const NYSA_CENTER:Vec3={x:0,y:0,z:-1200};
export const NYSA_RADIUS=170;
export const NYSA_APPROACH:Vec3={x:0,y:0,z:-980};
export const EREBUS_APPROACH:Vec3={x:0,y:0,z:-65};
export const APPROACH_RANGE=100,SAFE_SPEED=18;
export type FlightLeg='nysa'|'erebus';
export interface FlightState {leg:FlightLeg;phase:'launching'|'flying'|'landing'|'docking'|'landed'|'docked';position:Vec3;velocity:Vec3;throttle:number;timer:number;collisions:number;start:Vec3;}
export interface FlightInput {throttle:number;brake:boolean;boost:boolean;yaw:number;pitch:number;}
const copy=(v:Vec3)=>({...v});
export const flightSpeed=(f:FlightState)=>Math.hypot(f.velocity.x,f.velocity.y,f.velocity.z);
export const flightGoal=(f:FlightState)=>f.leg==='nysa'?NYSA_APPROACH:EREBUS_APPROACH;
export const flightDistance=(f:FlightState)=>{const t=flightGoal(f),p=f.position;return Math.hypot(t.x-p.x,t.y-p.y,t.z-p.z);};
export function startFlight(leg:FlightLeg):FlightState {
  const position=leg==='nysa'?{x:0,y:0,z:-20}:{x:0,y:0,z:-1022};
  return {leg,phase:'launching',position,velocity:{x:0,y:0,z:0},throttle:0,timer:0,collisions:0,start:copy(position)};
}
export function canApproach(f:FlightState){return f.phase==='flying'&&flightDistance(f)<=APPROACH_RANGE&&flightSpeed(f)<=SAFE_SPEED;}
export function beginApproach(f:FlightState):FlightState {
  return canApproach(f)?{...f,phase:f.leg==='nysa'?'landing':'docking',timer:0,throttle:0,velocity:{x:0,y:0,z:0},start:copy(f.position)}:f;
}
export function stepFlight(previous:FlightState,input:FlightInput,dt:number):FlightState {
  if(!Number.isFinite(dt)||dt<=0)return previous;
  dt=Math.min(dt,.05);
  const f={...previous,position:copy(previous.position),velocity:copy(previous.velocity),start:copy(previous.start)};
  if(f.phase!=='flying'){
    if(f.phase==='landed'||f.phase==='docked')return f;
    f.timer=Math.min(3,f.timer+dt);const t=f.timer/3,s=t*t*(3-2*t);
    const goal=f.phase==='launching'?(f.leg==='nysa'?{x:0,y:0,z:-80}:NYSA_APPROACH):f.phase==='landing'?{x:0,y:0,z:-1022}:{x:0,y:0,z:-20};
    for(const axis of ['x','y','z'] as const)f.position[axis]=f.start[axis]+(goal[axis]-f.start[axis])*s;
    if(f.timer>=3)f.phase=f.phase==='launching'?'flying':f.phase==='landing'?'landed':'docked';
    return f;
  }
  f.throttle=Math.max(0,Math.min(1,f.throttle+Math.max(-1,Math.min(1,input.throttle))*dt*.7));
  if(input.brake)f.throttle=Math.max(0,f.throttle-dt*1.8);
  const speed=f.throttle*(input.boost?180:110),pitch=Math.max(-1.35,Math.min(1.35,input.pitch));
  const desired={x:-Math.sin(input.yaw)*Math.cos(pitch)*speed,y:Math.sin(pitch)*speed,z:-Math.cos(input.yaw)*Math.cos(pitch)*speed};
  const blend=1-Math.exp(-(input.brake?5:1.4)*dt);
  for(const axis of ['x','y','z'] as const){f.velocity[axis]+=(desired[axis]-f.velocity[axis])*blend;f.position[axis]+=f.velocity[axis]*dt;}
  // At the fixed 60 Hz step, displacement is <=3 m, far below these hull radii.
  for(const [center,radius] of [[NYSA_CENTER,NYSA_RADIUS+8],[{x:0,y:0,z:0},52]] as const){
    const p=f.position,dx=p.x-center.x,dy=p.y-center.y,dz=p.z-center.z,d=Math.hypot(dx,dy,dz);
    if(d<radius){const scale=radius/Math.max(d,.001);p.x=center.x+dx*scale;p.y=center.y+dy*scale;p.z=center.z+(d>.001?dz*scale:radius);f.velocity={x:0,y:0,z:0};f.throttle=0;f.collisions++;}
  }
  if(Math.hypot(f.position.x,f.position.y,f.position.z)>2300){f.position=copy(flightGoal(f));f.velocity={x:0,y:0,z:0};f.throttle=0;f.collisions++;}
  return f;
}
