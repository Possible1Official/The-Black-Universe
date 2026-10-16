export interface TrailPoint {x:number;y:number;z:number}
const distance=(a:TrailPoint,b:TrailPoint)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
/** Follow walked breadcrumbs, not a straight line through buildings. Bounded memory. */
export class DroneFollow{
 command:'hold'|'follow'='hold';status:'holding'|'following'|'waiting'|'blocked'|'separated'='holding';
 private trail:TrailPoint[]=[];private last?:TrailPoint;private blocked=0;
 hold(status:typeof this.status='holding'){this.command='hold';this.status=status;this.trail=[];this.last=undefined;this.blocked=0;}
 follow(visitor:TrailPoint){this.command='follow';this.status='waiting';this.trail=[{...visitor}];this.last={...visitor};this.blocked=0;}
 plan(position:TrailPoint,visitor:TrailPoint,dt:number){
  const zero={x:0,y:0,z:0};if(this.command!=='follow'||!Number.isFinite(dt)||dt<=0)return zero;dt=Math.min(dt,.05);
  if(this.last&&distance(visitor,this.last)>4){this.hold('separated');return zero;}
  if(!this.last||distance(visitor,this.last)>=.35){if(this.trail.length>=256){this.hold('blocked');return zero;}this.trail.push({...visitor});this.last={...visitor};}
  while(this.trail.length&&distance(position,this.trail[0])<.18)this.trail.shift();
  let path=0,from=position;for(const p of this.trail){path+=distance(from,p);from=p;}
  if(!this.trail.length||path<=2.601){this.status='waiting';return zero;}
  const target=this.trail[0],d=distance(position,target),step=Math.min(d,5*dt,path-2.6);this.status='following';
  return {x:(target.x-position.x)/d*step,y:(target.y-position.y)/d*step,z:(target.z-position.z)/d*step};
 }
 record(intended:number,actual:number,dt:number){
  if(this.command!=='follow'||!Number.isFinite(dt)||dt<=0)return;
  this.blocked=intended>.001&&actual<intended*.1?this.blocked+Math.min(dt,.05):0;
  if(this.blocked>=2)this.hold('blocked');
 }
 snapshot(){return {command:this.command,status:this.status,queued:this.trail.length,blocked:this.blocked};}
}
