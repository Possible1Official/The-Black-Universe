import * as THREE from 'three';import RAPIER from '@dimforge/rapier3d-compat';
import {SurveyDrone,droneScanSite} from './survey-drone';import {VESPER_SITES,VESPER_PAD,type VesperReading} from './vesper';
import {clearSight} from './visibility';

/** Recovered ECHO accompanies the expedition; movement/rotors reuse the reviewed source. */
export class VesperCompanion{
 readonly drone:SurveyDrone<VesperReading>;track=false;private recorded:VesperReading[]=[];
 constructor(readonly world:RAPIER.World,readonly observer:RAPIER.Collider,readonly ground:(x:number,z:number)=>number){this.drone=new SurveyDrone<VesperReading>(ground,{originX:0,validScan:id=>VESPER_SITES.some(s=>s.id===id)});}
 arrive(recovered:boolean){this.track=false;this.drone.arrive(recovered,VESPER_PAD);this.drone.root.visible=false;}
 setReadings(readings:VesperReading[]){this.recorded=[...readings];}
 load(retry=false){if(this.drone.available)return this.drone.load(retry);}
 prompt(position:RAPIER.Vector,yaw:number,pitch:number){if(!this.drone.available)return '';const eye=new THREE.Vector3(position.x,position.y+.74,position.z),d=this.drone.root.position.clone().sub(eye),length=d.length(),forward=new THREE.Vector3(0,0,-1).applyEuler(new THREE.Euler(pitch,yaw,0,'YXZ'));return length<3&&d.normalize().dot(forward)>.45&&clearSight(this.world,eye,this.drone.root.position,this.observer)?'Speak to ECHO':'';}
 private anchor(id:VesperReading){const s=VESPER_SITES.find(s=>s.id===id)!;return new THREE.Vector3(s.x,this.ground(s.x,s.z)+.8,s.z);}
 canScan(id:VesperReading){const p=this.drone.root.position;return this.drone.available&&!this.recorded.includes(id)&&p.distanceTo(this.anchor(id))<=8&&clearSight(this.world,p,this.anchor(id),this.observer);}
 availableScan(){return droneScanSite(this.drone.root.position,this.recorded,VESPER_SITES.map(s=>({id:s.id,position:this.anchor(s.id)})),(_p,id)=>this.canScan(id));}
 follow(position:RAPIER.Vector){if(this.drone.available)this.drone.startFollowing(this.drone.visitor(this.world,position,this.observer));}
 scan(){const id=this.availableScan();if(id)this.drone.startScan(id);return id;}
 step(position:RAPIER.Vector,dt:number,onFoot:boolean){if(!Number.isFinite(dt)||dt<=0)return;const id=this.drone.scanning;if(id&&!this.canScan(id))this.drone.hold();const reading=this.drone.step(this.world,position,this.observer,dt,onFoot);return reading&&this.canScan(reading)?reading:undefined;}
 present(dt:number,walking:boolean,active:boolean){this.drone.root.visible=walking&&this.drone.available;this.drone.animate(dt,walking&&active);}
 waypoint(){return {point:this.drone.root.position,label:'ECHO / '+this.drone.snapshot().status};}
 snapshot(){return {...this.drone.snapshot(),tracked:this.track,availableScan:this.availableScan()??null};}
}
