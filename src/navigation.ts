import {bulkheadPanels} from './bulkheads';
import type {Progress} from './state';
import {forgeReadiness} from './power';
import {LANDING,SAMPLE,SURFACE_ORIGIN} from './excursion';
export interface NavPoint {x:number;z:number}
export interface Waypoint extends NavPoint {id:string;label:string;hint:string}
const at=(id:string,label:string,x:number,z:number,hint='Approach, face the console and interact with E.'):Waypoint=>({id,label,x,z,hint});
export function missionDestination(p:Progress,onSurface:boolean):Waypoint {
  if(onSurface)return p.surveyed
    ?at('extraction','Extraction beacon',SURFACE_ORIGIN,LANDING.z+2.4,'Approach the beacon and interact with E to return aboard.')
    :at('sample','Luminous outcrop',SURFACE_ORIGIN+SAMPLE.x,SAMPLE.z,'Approach the crystals and interact with E to secure a sample.');
  if(p.power.tripped || (!p.forged&&p.relays.length===3&&forgeReadiness(p.power,3)!==null))return at('diagnostics','Engineering diagnostics',-13.5,11.7,'Use diagnostics to restore stable Balanced routing and containment.');
  if(!p.relays.includes('navigation'))return at('navigation','Navigation relay',-5,-11);
  if(!p.relays.includes('engineering'))return at('engineering','Engineering relay',-16,10);
  if(!p.relays.includes('observatory'))return at('observatory','Observatory relay',16,10);
  if(!p.forged)return at('forge','Universe forge',0,-11);
  return at('science','Nysa science array',5,-11,p.surveyed?'Survey complete. The science array offers another visit.':'Scan the world and deploy to the surface.');
}
function room(x:number){return x< -11?-1:x>11?1:0;}
// Scripted doorway routing for this ship layout, not arbitrary obstacle pathfinding.
export function routeWaypoint(destination:Waypoint,position:NavPoint,doorOpen:readonly boolean[]):Waypoint {
  const current=room(position.x),next=room(destination.x);
  if(current===next)return destination;
  const side=current||next,port=side<0,name=port?'Port':'Starboard',roomName=port?'engineering':'observatory';
  if(current!==0){
    if(!doorOpen[port?0:1]){const panel=bulkheadPanels(side*11)[1];return at(`${name}-inside-panel`,`${name} interior access`,panel.x,panel.z,'Face the interior panel and press E to open the concourse passage.');}
    if(Math.abs(position.z-6)>1.2)return at(`${name}-inside`,`${name} doorway`,side*13,6,'Follow the passage to the habitat concourse.');
    return at(`${name}-exit`,'Habitat concourse',side*8.6,6,'Walk through the open bulkhead to the habitat concourse.');
  }
  if(!doorOpen[port?0:1])return at(`${name}-panel`,`${name} access panel`,side*10,3.2,`Face the panel and press E to open ${roomName}.`);
  if(Math.abs(position.z-6)>1.2)return at(`${name}-outside`,`${name} doorway`,side*8.6,6,'Align with the open passage.');
  return at(`${name}-enter`,`${port?'Engineering':'Observatory'} entrance`,side*13,6,'Walk through the open bulkhead.');
}
const degrees=(radians:number)=>radians*180/Math.PI;
export function navigationReading(position:NavPoint,yaw:number,target:NavPoint){
  const dx=target.x-position.x,dz=target.z-position.z,distance=Math.hypot(dx,dz);
  const heading=((degrees(-yaw)%360)+360)%360;
  const relative=distance<.001?0:Math.atan2(Math.sin(Math.atan2(dx,-dz)+yaw),Math.cos(Math.atan2(dx,-dz)+yaw));
  const direction=['N','NE','E','SE','S','SW','W','NW'][Math.round(heading/45)%8];
  const turn=Math.abs(relative)<Math.PI/12?'AHEAD':Math.abs(relative)>Math.PI*5/6?'BEHIND':relative>0?'RIGHT':'LEFT';
  return {distance,heading,direction,relativeDegrees:degrees(relative),turn};
}
