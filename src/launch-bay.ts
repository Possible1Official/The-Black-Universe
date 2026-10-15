import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {makeShuttle} from './flight-scene';
import {loadAuthoredAsset} from './authored-assets';
import {SHUTTLE_SIZE} from './shuttle';
export const LAUNCH_BAY={innerZ:-18.95,outerZ:-43.25,centerZ:-30.95,parkZ:-25.8,endZ:-49,returnZ:-51,boarding:{x:2.8,y:1.1,z:-23.6},exit:{x:1.35,y:.9,z:-19.8},cabinZ:10.825} as const;
export type LaunchPhase='parked'|'sealing'|'opening'|'departing'|'away'|'return-sealing'|'return-opening'|'return-turn'|'return-parking'|'return-closing'|'return-access'|'arrived';
const smooth=(t:number)=>t*t*(3-2*t);
export class LaunchInterlock{
 phase:LaunchPhase='parked';inner=0;outer=0;access=false;jetZ:number=LAUNCH_BAY.parkZ;jetYaw=0;private elapsed=0;
 get boarded(){return this.phase!=='parked'&&this.phase!=='away'&&this.phase!=='arrived';}
 get status(){return {parked:'PARKED',sealing:'SEALING INNER DOOR',opening:'OPENING OUTER DOOR',departing:'DEPARTING RUNWAY',away:'IN FLIGHT','return-sealing':'SECURING STATION DOOR','return-opening':'OPENING DOCKING DOOR','return-turn':'ALIGNING OUTSIDE BAY','return-parking':'GUIDED REVERSE PARKING','return-closing':'SEALING SPACE DOOR','return-access':'OPENING STATION ACCESS',arrived:'PARKED / DISEMBARKING'}[this.phase];}
 reset(){this.phase='parked';this.inner=this.outer=0;this.access=false;this.jetZ=LAUNCH_BAY.parkZ;this.jetYaw=0;this.elapsed=0;}
 beginReturn(){if(this.boarded||this.phase==='arrived')return false;this.phase='return-sealing';this.access=false;this.jetZ=LAUNCH_BAY.returnZ;this.jetYaw=Math.PI;this.elapsed=0;return true;}
 disembark(){if(this.phase!=='arrived')return false;this.phase='parked';this.access=true;return true;}
 requestAccess(){if(this.phase!=='parked'||this.outer>0)return false;this.access=!this.access;return true;}
 board(){if(this.phase!=='parked'||this.outer>0)return false;this.phase='sealing';this.access=false;return true;}
 step(dt:number,occupied=false){
  if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.05);
  if(this.phase==='parked')this.inner=THREE.MathUtils.clamp(this.inner+(this.access||occupied?1:-1)*dt/.9,0,1);
  else if(this.phase==='sealing'){if(!occupied)this.inner=Math.max(0,this.inner-dt/.9);if(this.inner===0)this.phase='opening';}
  else if(this.phase==='opening'){this.outer=Math.min(1,this.outer+dt/1.6);if(this.outer===1){this.phase='departing';this.elapsed=0;}}
  else if(this.phase==='departing'){this.elapsed=Math.min(5,this.elapsed+dt);const t=this.elapsed/5;this.jetZ=THREE.MathUtils.lerp(LAUNCH_BAY.parkZ,LAUNCH_BAY.endZ,t*t);if(this.elapsed===5)this.phase='away';}
  else if(this.phase==='return-sealing'){if(!occupied)this.inner=Math.max(0,this.inner-dt/.9);if(this.inner===0)this.phase='return-opening';}
  else if(this.phase==='return-opening'){this.outer=Math.min(1,this.outer+dt/1.6);if(this.outer===1){this.phase='return-turn';this.elapsed=0;}}
  // The craft turns outside the aperture, where its full swept footprint fits.
  // It then backs in facing outward, ready for its next departure.
  else if(this.phase==='return-turn'){this.elapsed=Math.min(2,this.elapsed+dt);this.jetYaw=Math.PI*(1-smooth(this.elapsed/2));if(this.elapsed===2){this.phase='return-parking';this.elapsed=0;}}
  else if(this.phase==='return-parking'){this.elapsed=Math.min(5,this.elapsed+dt);this.jetZ=THREE.MathUtils.lerp(LAUNCH_BAY.returnZ,LAUNCH_BAY.parkZ,smooth(this.elapsed/5));if(this.elapsed===5)this.phase='return-closing';}
  else if(this.phase==='return-closing'){this.outer=Math.max(0,this.outer-dt/1.6);if(this.outer===0)this.phase='return-access';}
  else if(this.phase==='return-access'){this.inner=Math.min(1,this.inner+dt/.9);if(this.inner===1)this.phase='arrived';}
 }
 snapshot(){return {phase:this.phase,inner:this.inner,outer:this.outer,jetZ:this.jetZ,jetYaw:this.jetYaw,boarded:this.boarded};}
}
export class LaunchBay{
 readonly root=new THREE.Group();readonly jet=makeShuttle();readonly state=new LaunchInterlock();
 readonly inner:THREE.Mesh;readonly outer:THREE.Mesh;private innerCollider?:RAPIER.Collider;private outerCollider?:RAPIER.Collider;hull?:RAPIER.Collider;
 constructor(load=true){
  this.root.name='Kestrel launch airlock';const metal=new THREE.MeshStandardMaterial({color:0x526674,metalness:.65,roughness:.48}),stripe=new THREE.MeshBasicMaterial({color:0x72dde8});
  const leaf=(w:number,h:number,z:number)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,.25),metal);mesh.position.set(0,h/2,z);mesh.castShadow=mesh.receiveShadow=true;this.root.add(mesh);const marking=new THREE.Mesh(new THREE.BoxGeometry(w*.8,.06,.27),stripe);marking.position.y=.15;mesh.add(marking);return mesh;};
  this.inner=leaf(3.4,3.4,LAUNCH_BAY.innerZ);this.outer=leaf(7.4,5.4,LAUNCH_BAY.outerZ);this.root.add(this.jet);this.jet.position.set(0,.06,LAUNCH_BAY.parkZ);
  if(load)void loadAuthoredAsset('craft',[this.jet]).catch(()=>console.warn('Parked jet asset unavailable; shuttle fallback retained'));
 }
 init(world:RAPIER.World){this.innerCollider=world.createCollider(RAPIER.ColliderDesc.cuboid(1.7,1.7,.125).setTranslation(0,1.7,LAUNCH_BAY.innerZ));this.outerCollider=world.createCollider(RAPIER.ColliderDesc.cuboid(3.7,2.7,.125).setTranslation(0,2.7,LAUNCH_BAY.outerZ));this.hull=world.createCollider(RAPIER.ColliderDesc.cuboid(SHUTTLE_SIZE[0]/2,SHUTTLE_SIZE[1]/2,SHUTTLE_SIZE[2]/2).setTranslation(0,.06+SHUTTLE_SIZE[1]/2,LAUNCH_BAY.parkZ));}
 sync(){const s=this.state;this.inner.position.y=1.7+s.inner*4;this.outer.position.y=2.7+s.outer*6;this.innerCollider?.setTranslation(this.inner.position);this.outerCollider?.setTranslation(this.outer.position);this.jet.position.z=s.jetZ;this.jet.rotation.y=s.jetYaw;this.jet.visible=s.phase!=='away';this.hull?.setEnabled(!s.boarded&&s.phase==='parked');}
}
