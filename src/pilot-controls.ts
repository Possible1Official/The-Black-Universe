export const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
export interface PilotHeading{yaw:number;pitch:number;}
export function steerPilot(heading:PilotHeading,right:number,up:number,dt:number):PilotHeading{
 if(!Number.isFinite(dt)||dt<=0)return heading;
 return {yaw:heading.yaw-clamp(right,-1,1)*dt,pitch:clamp(heading.pitch+clamp(up,-1,1)*dt*.7,-1.25,1.25)};
}
export function targetThrottle(current:number,delta:number,dt:number){return clamp(current+clamp(delta,-1,1)*Math.max(0,Math.min(dt,.05))*.7,0,1);}
export const WALK_SPEED=1.8,RUN_SPEED=4.2,JUMP_SPEED=4.2;
