import * as THREE from 'three';

// Reviewed grip centers on the existing, 2.5 m CGTrader Turbo Bike. These are
// chassis contacts: the suspended turbine does not move the handlebars.
export const BIKE_GRIPS=[new THREE.Vector3(-.45,1.273,-.56),new THREE.Vector3(.45,1.29,-.534)] as const;
export const BIKE_RIDER_SEAT=new THREE.Vector3(0,-.05,.05);
const point=(o:THREE.Object3D)=>o.getWorldPosition(new THREE.Vector3());
function worldRotation(o:THREE.Object3D,q:THREE.Quaternion){
  const parent=o.parent?.getWorldQuaternion(new THREE.Quaternion())??new THREE.Quaternion();
  o.quaternion.copy(parent.invert().multiply(q));o.updateWorldMatrix(false,true);
}
function rotateWorld(o:THREE.Object3D,q:THREE.Quaternion){worldRotation(o,q.clone().multiply(o.getWorldQuaternion(new THREE.Quaternion())));}

// Analytic two-bone solve with a stable elbow pole and a bounded reachable
// target. Bone lengths/scales are never changed, including unreachable inputs.
export function solveArm(upper:THREE.Object3D,lower:THREE.Object3D,hand:THREE.Object3D,target:THREE.Vector3,pole:THREE.Vector3){
  upper.updateWorldMatrix(true,true);
  const s=point(upper),e=point(lower),w=point(hand),a=s.distanceTo(e),b=e.distanceTo(w),d=target.clone().sub(s),distance=d.length();
  if(a<1e-6||b<1e-6||distance<1e-6)return;
  d.divideScalar(distance);const reach=THREE.MathUtils.clamp(distance,Math.abs(a-b)+.0001,a+b-.0001),along=(a*a-b*b+reach*reach)/(2*reach);
  const bend=pole.clone().sub(s);bend.addScaledVector(d,-bend.dot(d));
  if(bend.lengthSq()<1e-8){bend.copy(e).sub(s);bend.addScaledVector(d,-bend.dot(d));}
  if(bend.lengthSq()<1e-8){bend.set(Math.abs(d.y)<.9?0:1,Math.abs(d.y)<.9?1:0,0);bend.addScaledVector(d,-bend.dot(d));}
  const elbow=s.clone().addScaledVector(d,along).addScaledVector(bend.normalize(),Math.sqrt(Math.max(0,a*a-along*along)));
  rotateWorld(upper,new THREE.Quaternion().setFromUnitVectors(e.sub(s).normalize(),elbow.clone().sub(s).normalize()));
  const current=point(lower),end=point(hand),goal=s.addScaledVector(d,reach);
  rotateWorld(lower,new THREE.Quaternion().setFromUnitVectors(end.sub(current).normalize(),goal.sub(current).normalize()));
}

export class BikeRiderContact{
  private readonly saved=new Map<THREE.Object3D,THREE.Quaternion>();
  private readonly bones=new Map<string,THREE.Bone>();
  private errors:number[]=[];
  constructor(readonly root:THREE.Object3D){root.traverse(o=>{if(o instanceof THREE.Bone)this.bones.set(o.name.replace(':',''),o);});}
  restore(){for(const [bone,q]of this.saved)bone.quaternion.copy(q);this.saved.clear();this.errors=[];}
  private bone(name:string){
    // This CGTrader rig labels its little fingers as a second Ring chain;
    // glTF sanitizes the source .001 suffix to 001. Keep the skin unchanged.
    return this.bones.get('mixamorig'+name)??(name.includes('Pinky')?this.bones.get('mixamorig'+name.replace('Pinky','Ring')+'001'):undefined);
  }
  private save(o:THREE.Object3D){if(!this.saved.has(o))this.saved.set(o,o.quaternion.clone());}
  apply(bike:THREE.Object3D){
    this.restore();this.root.updateWorldMatrix(true,true);bike.updateWorldMatrix(true,false);
    const spine=this.bone('Spine'),neck=this.bone('Neck');
    if(!spine)return;
    const rotation=bike.getWorldQuaternion(new THREE.Quaternion()),x=new THREE.Vector3(1,0,0).applyQuaternion(rotation),up=new THREE.Vector3(0,1,0).applyQuaternion(rotation);
    this.save(spine);rotateWorld(spine,new THREE.Quaternion().setFromAxisAngle(x,-.65));
    if(neck){this.save(neck);rotateWorld(neck,new THREE.Quaternion().setFromAxisAngle(x,.5));}
    for(const [i,side]of ['Left','Right'].entries()){
      const upper=this.bone(side+'Arm'),lower=this.bone(side+'ForeArm'),hand=this.bone(side+'Hand');
      const index=this.bone(side+'HandIndex1'),pinky=this.bone(side+'HandPinky1'),middle=this.bone(side+'HandMiddle1'),ring=this.bone(side+'HandRing1');
      if(!upper||!lower||!hand||!index||!pinky||!middle||!ring)continue;
      for(const o of [upper,lower,hand])this.save(o);
      const knuckles=[index,middle,ring,pinky].map(o=>hand.worldToLocal(point(o))),palm=knuckles.reduce((sum,v)=>sum.add(v),new THREE.Vector3()).multiplyScalar(.65/4);
      const forward=palm.clone().normalize(),across=knuckles[0].clone().sub(knuckles[3]);across.addScaledVector(forward,-across.dot(forward)).normalize();
      const localBasis=new THREE.Matrix4().makeBasis(forward,across,forward.clone().cross(across));
      const f=new THREE.Vector3(0,-.25,-1).normalize().applyQuaternion(rotation),cross=new THREE.Vector3(i===0?1:-1,0,0).applyQuaternion(rotation);
      const desired=new THREE.Matrix4().makeBasis(f,cross,f.clone().cross(cross)).multiply(localBasis.invert()),q=new THREE.Quaternion().setFromRotationMatrix(desired);
      const grip=bike.localToWorld(BIKE_GRIPS[i].clone()),palmTarget=grip.clone().addScaledVector(up,.018),wrist=palmTarget.clone().sub(palm.clone().multiply(hand.getWorldScale(new THREE.Vector3())).applyQuaternion(q));
      const pole=bike.localToWorld(new THREE.Vector3(i===0?-.65:.65,1.12,.05));
      solveArm(upper,lower,hand,wrist,pole);worldRotation(hand,q);
      // Curl the four fingers around the existing bar, leaving the authored
      // thumb/hand proportions intact. The mixer pose is restored before reuse.
      for(const finger of ['Index','Middle','Ring','Pinky'])for(let joint=1;joint<=3;joint++){
        const bone=this.bone(side+'Hand'+finger+joint);if(!bone)continue;this.save(bone);rotateWorld(bone,new THREE.Quaternion().setFromAxisAngle(x,joint===1?-.35:joint===2?-.8:-.65));
      }
      this.errors.push(hand.localToWorld(palm.clone()).distanceTo(palmTarget));
    }
  }
  snapshot(){return {active:this.saved.size>0,palmErrors:[...this.errors]};}
}
