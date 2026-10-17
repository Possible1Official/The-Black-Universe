import type {TrailPoint} from './drone-follow';

export const DETOUR_CELL=1.2,DETOUR_RADIUS=4,DETOUR_SWEEPS=160;
const distance=(a:TrailPoint,b:TrailPoint)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const finite=(p:TrailPoint)=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z);
/** Small, synchronous local A*: bounded queries, no global mesh or teleportation. */
export function droneDetour(from:TrailPoint,to:TrailPoint,hover:(x:number,z:number)=>number|undefined,clear:(a:TrailPoint,b:TrailPoint)=>boolean){
 const result={points:[] as TrailPoint[],sweeps:0,samples:0};
 if(!finite(from)||!finite(to)||distance(from,to)>6||distance(from,to)<.01)return result;
 type Node={x:number;z:number;p:TrailPoint;g:number;f:number;parent?:Node;closed:boolean};
 const nodes=new Map<string,Node|null>(),edges=new Map<string,boolean>();
 const start:Node={x:0,z:0,p:{...from},g:0,f:distance(from,to),closed:false};nodes.set('0,0',start);const open=[start];
 const edge=(a:Node,b:Node)=>{
  if(Math.abs(a.p.y-b.p.y)>1.1)return false;
  const keys=[`${a.x},${a.z}`,`${b.x},${b.z}`].sort(),key=keys.join(':');
  if(edges.has(key))return edges.get(key)!;
  if(result.sweeps>=DETOUR_SWEEPS)return false;
  result.sweeps++;const ok=clear(a.p,b.p);edges.set(key,ok);return ok;
 };
 const goal:Node={x:99,z:99,p:{...to},g:Infinity,f:0,closed:false};
 while(open.length&&result.sweeps<DETOUR_SWEEPS){
  open.sort((a,b)=>a.f-b.f);const current=open.shift()!;if(current.closed)continue;current.closed=true;
  if(distance(current.p,to)<=DETOUR_CELL*2&&edge(current,goal)){
   const path:TrailPoint[]=[{...to}];let node:Node|undefined=current;
   while(node&&node!==start){path.unshift({...node.p});node=node.parent;}
   result.points=path;return result;
  }
  for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
   const x=current.x+dx,z=current.z+dz;if(Math.abs(x)>DETOUR_RADIUS||Math.abs(z)>DETOUR_RADIUS)continue;
   const key=`${x},${z}`;let next=nodes.get(key);
   if(next===undefined){
    result.samples++;const px=from.x+x*DETOUR_CELL,pz=from.z+z*DETOUR_CELL,y=hover(px,pz);
    next=y!==undefined&&Number.isFinite(y)?{x,z,p:{x:px,y,z:pz},g:Infinity,f:Infinity,closed:false}:null;nodes.set(key,next);
   }
   if(!next||next.closed||!edge(current,next))continue;
   const g=current.g+distance(current.p,next.p);if(g>=next.g)continue;
   next.g=g;next.f=g+distance(next.p,to);next.parent=current;if(!open.includes(next))open.push(next);
  }
 }
 return result;
}
