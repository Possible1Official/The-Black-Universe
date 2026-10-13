import RAPIER from '@dimforge/rapier3d-compat';
type Position={x:number;y:number;z:number};
/** Collision-based sight, not render-mesh visibility; endpoints ignore their own bodies. */
export function clearSight(world:RAPIER.World,from:Position,to:Position,observer?:RAPIER.Collider,target?:RAPIER.Collider){
  const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z,distance=Math.hypot(dx,dy,dz);
  if(distance<=.03)return true;
  const ray=new RAPIER.Ray(from,{x:dx/distance,y:dy/distance,z:dz/distance});
  return !world.castRay(ray,distance-.03,true,undefined,undefined,observer,undefined,c=>c.handle!==target?.handle);
}
export function attendVisitor(distance:number,attending:boolean,speaking:boolean,visible=true){
  // Personal-space yielding remains available even when eye sight is obstructed.
  return speaking||distance<.75||(visible&&distance<(attending?2.2:1.8));
}
