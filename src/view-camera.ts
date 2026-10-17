import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {STATION_HULL,STATION_ASSEMBLY} from './station';
import {NYSA_CENTER,NYSA_RADIUS} from './flight';
import {VESPER,VESPER_RADIUS} from './vesper';

// Near-plane clearance is deliberately wider than the player's eye ray.
const cameraShape=new RAPIER.Ball(.22);
export function walkingCamera(world:RAPIER.World,eye:THREE.Vector3,yaw:number,pitch:number,observer:RAPIER.Collider){
  const rotation=new THREE.Euler(pitch,yaw,0,'YXZ'),forward=new THREE.Vector3(0,0,-1).applyEuler(rotation);
  const desired=new THREE.Vector3(.4,.35,3.2).applyEuler(rotation).add(eye);
  const direction=desired.clone().sub(eye),length=direction.length();direction.normalize();
  const hit=world.castShape(eye,{x:0,y:0,z:0,w:1},direction,cameraShape,0,length,true,undefined,undefined,observer);
  const distance=hit?Math.max(0,hit.time_of_impact-.04):length;
  return {position:eye.clone().addScaledVector(direction,distance),target:eye.clone().addScaledVector(forward,8),distance};
}

/** Ray-box clearance for the authored superstructure and functional hangar. */
export function orbitalCameraDistance(from:THREE.Vector3,to:THREE.Vector3){
  const delta=to.clone().sub(from),length=delta.length();let fraction=1;
  for(const b of [...STATION_HULL,STATION_ASSEMBLY]){
    let near=0,far=1;
    for(const [i,a] of ['x','y','z'].entries()){
      const axis=a as 'x'|'y'|'z',lo=b.position[i]-b.size[i]/2-.25,hi=b.position[i]+b.size[i]/2+.25;
      if(Math.abs(delta[axis])<1e-9){if(from[axis]<lo||from[axis]>hi){near=2;break;}}
      else{let t0=(lo-from[axis])/delta[axis],t1=(hi-from[axis])/delta[axis];if(t0>t1)[t0,t1]=[t1,t0];near=Math.max(near,t0);far=Math.min(far,t1);}
    }
    if(near<=far&&near>=0&&near<=1)fraction=Math.min(fraction,Math.max(0,near-.05/length));
  }
  // Keep the chase camera outside the visual planet too, even during capture.
  for(const [center,radius] of [[NYSA_CENTER,NYSA_RADIUS],[VESPER,VESPER_RADIUS]] as const){const offset=from.clone().sub(new THREE.Vector3(center.x,center.y,center.z)),r=radius+.25;
    const a=delta.lengthSq(),b=2*offset.dot(delta),c=offset.lengthSq()-r*r,disc=b*b-4*a*c;
    if(a>0&&disc>=0){const t=(-b-Math.sqrt(disc))/(2*a);if(t>=0&&t<=1)fraction=Math.min(fraction,Math.max(0,t-.05/length));}}
  return length*fraction;
}

export function flightCamera(origin:THREE.Vector3,rotation:THREE.Euler,clearance:(from:THREE.Vector3,to:THREE.Vector3)=>number){
  const eye=origin.clone().add(new THREE.Vector3(0,.6,0).applyEuler(rotation));
  const desired=origin.clone().add(new THREE.Vector3(0,4,13).applyEuler(rotation));
  const direction=desired.clone().sub(eye),length=direction.length();
  const distance=Math.max(0,Math.min(length,clearance(eye,desired)));
  return {position:eye.clone().addScaledVector(direction.normalize(),distance),target:origin.clone().add(new THREE.Vector3(0,.6,-12).applyEuler(rotation)),distance};
}

export function surfaceCameraDistance(world:RAPIER.World,from:THREE.Vector3,to:THREE.Vector3,observer:RAPIER.Collider,craft:RAPIER.Collider,hatch?:RAPIER.Collider){
  const direction=to.clone().sub(from),length=direction.length();
  if(length<1e-9)return 0;
  direction.divideScalar(length);
  // During takeoff/touchdown the parked proxy represents our own moving craft.
  // It stays solid for walking, but cannot occlude its own chase camera.
  // A center ray misses grazing rock faces/door frames that still intersect the
  // near plane. Sweep the same clearance volume used by the walking camera.
  const hit=world.castShape(from,{x:0,y:0,z:0,w:1},direction,cameraShape,0,length,true,undefined,undefined,observer,undefined,c=>c.handle!==craft.handle&&c.handle!==hatch?.handle);
  return hit?Math.max(0,hit.time_of_impact-.04):length;
}
