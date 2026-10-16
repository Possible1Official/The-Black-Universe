import {LEGACY_SHIP_LAYOUT,type ShipLayout} from './ship-layout';
import {bulkheadPanels} from './bulkheads';
import type {Progress} from './state';
import {forgeReadiness} from './power';
import {LANDING,SAMPLE,SURFACE_ORIGIN,SITE_HALF,landingPad,type LandingSite} from './excursion';
import {SHUTTLE_HATCH_Z} from './shuttle';
import {SUPPLY_CACHE} from './supplies';
import {FIELD_SITES,type FieldScan} from './survey';
import {expeditionStep} from './relay-expedition';
export interface NavPoint {x:number;z:number}
export type SurfaceTrack=FieldScan|'supplies'|'network'|'drone'|NavPoint;
export interface Waypoint extends NavPoint {id:string;label:string;hint:string}
const at=(id:string,label:string,x:number,z:number,hint='Approach, face the console and interact with E.'):Waypoint=>({id,label,x,z,hint});
export function missionDestination(p:Progress,onSurface:boolean,tracked?:SurfaceTrack,landing:LandingSite='survey',layout:ShipLayout=LEGACY_SHIP_LAYOUT):Waypoint {
  const pad=landingPad(landing);
  if(onSurface&&tracked==='network'){const step=expeditionStep(p.network);return at('network-'+step.id,step.label,SURFACE_ORIGIN+step.x,step.z,step.id==='uplink'?'Enter the open outpost and use its uplink console.':'Approach the amber receiver console. Press E to repair it.');}
  if(onSurface&&typeof tracked==='object'&&Number.isFinite(tracked.x)&&Number.isFinite(tracked.z)&&Math.abs(tracked.x)<=SITE_HALF-3&&Math.abs(tracked.z)<=SITE_HALF-3)return at('surface-pin','Survey waypoint',SURFACE_ORIGIN+tracked.x,tracked.z,'Straight-line guidance only; choose a clear route around rocks. Field log restores mission guidance.');
  if(onSurface&&tracked==='supplies'&&!p.supplies.cacheClaimed)return at('supplies','Coolant supply cache',SURFACE_ORIGIN+SUPPLY_CACHE.x,SUPPLY_CACHE.z,'Recover cartridges with E when your reserve has space.');
  const site=FIELD_SITES.find(s=>s.id===tracked);
  if(onSurface&&site&&!p.fieldScans.includes(site.id))return at(`field-${site.id}`,site.label,SURFACE_ORIGIN+site.x,site.z,'Approach the illuminated scanner and press E to record a reading. Field log restores mission guidance.');
  if(onSurface)return p.surveyed
    ?at('extraction','Kestrel shuttle hatch',SURFACE_ORIGIN+pad.x,pad.z+SHUTTLE_HATCH_Z,'Board with E, fly to Erebus and brake at the docking ring.')
    :at('sample','Luminous outcrop',SURFACE_ORIGIN+SAMPLE.x,SAMPLE.z,'Approach the crystals and interact with E to secure a sample.');
  if(p.power.tripped || (!p.forged&&p.relays.length===3&&forgeReadiness(p.power,3)!==null))return at('diagnostics','Engineering diagnostics',layout.diagnostics.x,layout.diagnostics.z,'Use diagnostics to restore stable Balanced routing and containment.');
  if(!p.relays.includes('navigation'))return at('navigation','Navigation relay',layout.navigation.x,layout.navigation.z);
  if(!p.relays.includes('engineering'))return at('engineering','Engineering relay',layout.engineering.x,layout.engineering.z);
  if(!p.relays.includes('observatory'))return at('observatory','Observatory relay',layout.observatory.x,layout.observatory.z);
  if(!p.forged)return at('forge','Universe forge',layout.forge.x,layout.forge.z);
  return at('science','Nysa science array',layout.science.x,layout.science.z,p.surveyed?'Survey complete. Launch Kestrel for another visit.':'Scan Nysa and launch Kestrel. Fly to the approach ring and land.');
}
function room(x:number,boundary:number){return x< -boundary?-1:x>boundary?1:0;}
// Scripted doorway routing for this ship layout, not arbitrary obstacle pathfinding.
export function routeWaypoint(destination:Waypoint,position:NavPoint,doorOpen:readonly boolean[],layout:ShipLayout=LEGACY_SHIP_LAYOUT):Waypoint {
  const current=room(position.x,layout.roomBoundary),next=room(destination.x,layout.roomBoundary);
  if(current===next)return destination;
  const side=current||next,port=side<0,name=port?'Port':'Starboard',roomName=port?'engineering':'observatory';
  if(current!==0){
    if(!doorOpen[port?0:1]){const panel=bulkheadPanels(side*layout.doorX,layout.doorZ,layout.panelOffsetZ)[1];return at(`${name}-inside-panel`,`${name} interior access`,panel.x,panel.z,'Face the interior panel and press E to open the concourse passage.');}
    if(Math.abs(position.z-layout.doorZ)>1.2)return at(`${name}-inside`,`${name} doorway`,side*layout.insideX,layout.doorZ,'Follow the passage to the habitat concourse.');
    return at(`${name}-exit`,'Habitat concourse',side*layout.outsideX,layout.doorZ,'Walk through the open bulkhead to the habitat concourse.');
  }
  if(!doorOpen[port?0:1])return at(`${name}-panel`,`${name} access panel`,side*(layout.doorX-1),layout.doorZ-layout.panelOffsetZ,`Face the panel and press E to open ${roomName}.`);
  if(Math.abs(position.z-layout.doorZ)>1.2)return at(`${name}-outside`,`${name} doorway`,side*layout.outsideX,layout.doorZ,'Align with the open passage.');
  return at(`${name}-enter`,`${port?'Engineering':'Observatory'} entrance`,side*layout.insideX,layout.doorZ,'Walk through the open bulkhead.');
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
