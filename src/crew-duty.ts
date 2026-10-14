import {attendVisitor} from './visibility';
import {planPatrol,type Point,type PatrolState} from './patrol';

/** Engineering-only authored graph; no arbitrary obstacle avoidance or remote AI. */
export const ENGINEERING_GRAPH={
  patrol:{point:{x:-16,z:7},neighbors:['junction']},
  junction:{point:{x:-14.5,z:8.5},neighbors:['patrol','watch']},
  watch:{point:{x:-14.6,z:10.8},neighbors:['junction']},
} as const;
export type DutyNode=keyof typeof ENGINEERING_GRAPH;
export type EngineeringGraph=Record<DutyNode,{point:Point;neighbors:readonly DutyNode[]}>;
export const INTREPID_ENGINEERING_GRAPH:EngineeringGraph={patrol:{point:{x:-4.4,z:-6.7},neighbors:['junction']},junction:{point:{x:-5.5,z:-6.7},neighbors:['patrol','watch']},watch:{point:{x:-6,z:-6.2},neighbors:['junction']}};
export type EngineeringDuty={phase:'watch'|'return';path:DutyNode[];cursor:number;blocked:number;retry:number};
const diagnostic={x:-13.5,z:11.7};
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
export function engineeringPath(position:Point,goal:DutyNode='watch',graph:EngineeringGraph=ENGINEERING_GRAPH):DutyNode[]{
  const nodes=Object.keys(graph) as DutyNode[];
  const start=nodes.reduce((best,node)=>distance(position,graph[node].point)<distance(position,graph[best].point)?node:best,nodes[0]);
  const queue:DutyNode[][]=[[start]],visited=new Set<DutyNode>([start]);
  while(queue.length){
    const path=queue.shift()!,node=path[path.length-1];if(node===goal)return path;
    for(const next of graph[node].neighbors)if(!visited.has(next)){visited.add(next);queue.push([...path,next]);}
  }
  return [];
}
export function planEngineeringDuty(previous:EngineeringDuty|null,patrol:PatrolState,position:Point,route:readonly [Point,Point],visitor:Point,dt:number,tripped:boolean,speaking=false,visible=true,graph:EngineeringGraph=ENGINEERING_GRAPH,diagnosticPoint:Point=diagnostic){
  if(!tripped&&!previous)return {duty:null,...planPatrol(patrol,position,route,visitor,dt,speaking,visible)};
  const phase=tripped?'watch':'return',goal=tripped?'watch':'junction';
  const duty:EngineeringDuty=previous?.phase===phase?{...previous,path:[...previous.path]}:{phase,path:engineeringPath(position,goal,graph),cursor:0,blocked:0,retry:0};
  const state={...patrol,blocked:0};
  if(attendVisitor(distance(position,visitor),patrol.mode==='attending',speaking,visible)){
    state.mode='attending';duty.blocked=0;return {duty,state,displacement:{x:0,z:0},facing:visitor};
  }
  if(duty.retry>0){duty.retry=Math.max(0,duty.retry-dt);state.mode='waiting';return {duty,state,displacement:{x:0,z:0},facing:diagnosticPoint};}
  while(duty.cursor<duty.path.length&&distance(position,graph[duty.path[duty.cursor]].point)<.12)duty.cursor++;
  if(duty.cursor>=duty.path.length){
    if(duty.phase==='return')return {duty:null,...planPatrol({...patrol,wait:0,blocked:0,mode:'patrolling'},position,route,visitor,dt,speaking,visible)};
    state.mode='inspecting';return {duty,state,displacement:{x:0,z:0},facing:diagnosticPoint};}
  state.mode='patrolling';const facing=graph[duty.path[duty.cursor]].point,dx=facing.x-position.x,dz=facing.z-position.z,len=Math.hypot(dx,dz),step=Math.min(len,.65*dt);
  return {duty,state,displacement:{x:dx/len*step,z:dz/len*step},facing};
}
export function recordDutyMovement(previous:EngineeringDuty,intended:number,actual:number,dt:number,position:Point,graph:EngineeringGraph=ENGINEERING_GRAPH):EngineeringDuty{
  const blocked=intended>.001&&actual<intended*.1?previous.blocked+dt:0;
  if(blocked>=2)return {phase:previous.phase,path:engineeringPath(position,previous.phase==='watch'?'watch':'junction',graph),cursor:0,blocked:0,retry:.4};
  return {...previous,blocked};
}
