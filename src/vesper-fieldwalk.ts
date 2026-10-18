import type {Point} from './patrol';
// Shelter aisle → central door → clear southern approach to the warm fissure.
export const FIELDWALK_ROUTE:readonly Point[]=[{x:3,z:-19.5},{x:1,z:-19.5},{x:1,z:-13},{x:9,z:-11},{x:15,z:-12},{x:20,z:-14.8}];
export type FieldWalk={phase:'outbound'|'site'|'return';path:Point[];cursor:number;visited:Point[];blocked:number;status:'walking'|'waiting'|'yielding'|'blocked'|'at-site'};
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
export function startFieldWalk(position:Point,archived:boolean):FieldWalk|null{return archived?{phase:'outbound',path:FIELDWALK_ROUTE.map(p=>({...p})),cursor:0,visited:[{x:position.x,z:position.z}],blocked:0,status:'walking'}:null;}
export function returnFieldWalk(walk:FieldWalk):FieldWalk{if(walk.phase==='return')return walk.blocked>=2?{...walk,blocked:0,status:'walking'}:walk;const path=[...walk.visited].reverse().map(p=>({...p}));if(distance(path[path.length-1],FIELDWALK_ROUTE[0])>.08)path.push({...FIELDWALK_ROUTE[0]});return {...walk,phase:'return',path,cursor:0,blocked:0,status:'walking'};}
export function planFieldWalk(previous:FieldWalk,position:Point,visitor:Point,dt:number){
 const walk={...previous,path:previous.path,visited:[...previous.visited]};const zero={x:0,z:0};
 if(!Number.isFinite(dt)||dt<=0)return {walk,displacement:zero,facing:position,done:false};dt=Math.min(dt,.05);
 if(walk.phase==='site'){walk.status='at-site';return {walk,displacement:zero,facing:visitor,done:false};}
 if(walk.blocked>=2){walk.status='blocked';return {walk,displacement:zero,facing:visitor,done:false};}
 const target=walk.path[walk.cursor];if(distance(position,target)<.1){if(walk.phase==='outbound'&&distance(walk.visited[walk.visited.length-1],target)>.08)walk.visited.push({...target});walk.cursor++;walk.blocked=0;if(walk.cursor===walk.path.length){if(walk.phase==='outbound'){walk.phase='site';walk.status='at-site';return {walk,displacement:zero,facing:visitor,done:false};}return {walk,displacement:zero,facing:visitor,done:true};}}
 const gap=distance(position,visitor);if(gap>6||gap<.85){walk.status=gap>6?'waiting':'yielding';walk.blocked=0;return {walk,displacement:zero,facing:visitor,done:false};}
 walk.status='walking';const to=walk.path[walk.cursor],d=distance(position,to),step=Math.min(.8*dt,d);return {walk,displacement:{x:(to.x-position.x)/d*step,z:(to.z-position.z)/d*step},facing:to,done:false};
}
export function recordFieldWalk(walk:FieldWalk,intended:number,actual:number,dt:number){if(walk.blocked>=2||!Number.isFinite(dt)||dt<=0)return walk;const blocked=intended>.001&&actual<intended*.1?walk.blocked+Math.min(dt,.05):0;return {...walk,blocked,status:blocked>=2?'blocked':walk.status};}
