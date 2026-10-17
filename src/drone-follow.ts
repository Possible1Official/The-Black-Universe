export interface TrailPoint {x:number;y:number;z:number}
const distance=(a:TrailPoint,b:TrailPoint)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
/** Follow walked breadcrumbs, not a straight line through buildings. Bounded memory. */
export class DroneFollow{
 command:'hold'|'follow'='hold';status:'holding'|'following'|'detouring'|'waiting'|'blocked'|'separated'='holding';
 private trail:TrailPoint[]=[];private last?:TrailPoint;private blocked=0;private detourPoints=0;
 hold(status:typeof this.status='holding'){this.command='hold';this.status=status;this.trail=[];this.last=undefined;this.blocked=0;this.detourPoints=0;}
 follow(visitor:TrailPoint){this.hold();this.command='follow';this.status='waiting';this.trail=[{...visitor}];this.last={...visitor};}
 target(){return this.trail[0]?{...this.trail[0]}:undefined;}
 reroute(points:readonly TrailPoint[]){
  const target=this.trail[0],last=points[points.length-1];
  if(this.command!=='follow'||!target||!last||distance(last,target)>.01||points.length+this.trail.length-1>256||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||!Number.isFinite(p.z)))return false;
  this.trail.splice(0,1,...points.map(p=>({...p})));this.detourPoints=points.length;this.blocked=0;this.status='detouring';return true;
 }
 plan(position:TrailPoint,visitor:TrailPoint,dt:number){
  const zero={x:0,y:0,z:0};if(this.command!=='follow'||!Number.isFinite(dt)||dt<=0)return zero;dt=Math.min(dt,.05);
  if(this.last&&distance(visitor,this.last)>4){this.hold('separated');return zero;}
  if(!this.last||distance(visitor,this.last)>=.35){if(this.trail.length>=256){this.hold('blocked');return zero;}this.trail.push({...visitor});this.last={...visitor};}
  while(this.trail.length&&distance(position,this.trail[0])<.18){this.trail.shift();this.detourPoints=Math.max(0,this.detourPoints-1);}
  let path=0,from=position;for(const p of this.trail){path+=distance(from,p);from=p;}
  if(!this.trail.length||path<=2.601){this.status='waiting';return zero;}
  const target=this.trail[0],d=distance(position,target),step=Math.min(d,5*dt,path-2.6);this.status=this.detourPoints?'detouring':'following';
  return {x:(target.x-position.x)/d*step,y:(target.y-position.y)/d*step,z:(target.z-position.z)/d*step};
 }
 record(intended:number,actual:number,dt:number){
  if(this.command!=='follow'||!Number.isFinite(dt)||dt<=0)return;
  this.blocked=intended>.001&&actual<intended*.1?this.blocked+Math.min(dt,.05):0;
  if(this.blocked>=2)this.hold('blocked');
 }
 snapshot(){return {command:this.command,status:this.status,queued:this.trail.length,blocked:this.blocked};}
}
