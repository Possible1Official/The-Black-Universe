import * as THREE from 'three';
import {ROCK_HULL_VERTICES} from './rock-hull';
import {requestedAsset} from './requested-assets';

export type RockInstance={contact?:THREE.Vector3;matrix:THREE.Matrix4;color:THREE.Color};
export function selectDetailedRocks(points:readonly THREE.Vector3[],eye:THREE.Vector3,high:boolean,previous:readonly number[]=[]){
 const retained=new Set(previous),radius=high?36:24,cap=high?20:12;
 return points.map((p,i)=>({i,d:p.distanceTo(eye),held:retained.has(i)}))
  .filter(p=>p.d<radius+(p.held?4:0)).sort((a,b)=>(a.d-(a.held?2:0))-(b.d-(b.held?2:0))||a.i-b.i)
  .slice(0,cap).map(p=>p.i).sort((a,b)=>a-b);
}
type RockSource={geometry:THREE.BufferGeometry;material:THREE.Material};
async function loadRock():Promise<RockSource>{
 const source=await requestedAsset('rock'),meshes:THREE.Mesh[]=[];source.scene.traverse(o=>{if(o instanceof THREE.Mesh)meshes.push(o);});
 if(meshes.length!==1||Array.isArray(meshes[0].material)||source.animations.length)throw Error('Invalid static rock resource');
 return {geometry:meshes[0].geometry,material:meshes[0].material};
}
/** Bounded instanced scenery only; existing Rapier rock proxies are untouched. */
export class RockScenery{
 readonly root=new THREE.Group();private detail?:THREE.InstancedMesh;private selected:number[]=[];
 private visible=false;private eye=new THREE.Vector3();private readonly contactBounds:{x:number;z:number;width:number;depth:number}[];
 private pending?:Promise<boolean>;private status='idle';private readonly points:THREE.Vector3[];
 constructor(private readonly fallback:THREE.InstancedMesh,private readonly instances:readonly RockInstance[],private readonly loader=loadRock){
  this.root.name='NysaRockScenery';this.root.add(fallback);this.points=instances.map(p=>new THREE.Vector3().setFromMatrixPosition(p.matrix));
  this.contactBounds=instances.map(p=>{const box=new THREE.Box3();for(let i=0;i<ROCK_HULL_VERTICES.length;i+=3)box.expandByPoint(new THREE.Vector3().fromArray(ROCK_HULL_VERTICES,i).applyMatrix4(p.matrix));const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());return {x:p.contact?.x??center.x,z:p.contact?.z??center.z,width:size.x*.4,depth:size.z*.4};});
 }
 load(retry=false):Promise<boolean>{
  if(this.detail)return Promise.resolve(true);if(this.pending)return this.pending;if(this.status==='failed'&&!retry)return Promise.resolve(false);
  this.status='loading';this.pending=Promise.resolve().then(()=>this.loader()).then(source=>{
   this.detail=new THREE.InstancedMesh(source.geometry,source.material,20);this.detail.name='ScannedRockInstances';this.detail.count=0;
   this.detail.castShadow=this.detail.receiveShadow=true;this.detail.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.root.add(this.detail);this.status='ready';return true;
  }).catch(()=>{this.status='failed';console.warn('Rock detail unavailable; simple scenery retained.');return false;}).finally(()=>{this.pending=undefined;});return this.pending;
 }
 update(eye:THREE.Vector3,high:boolean,visible:boolean){
  this.visible=visible;this.eye.copy(eye);
  const next=this.detail&&visible?selectDetailedRocks(this.points,eye,high,this.selected):[];
  if(next.length===this.selected.length&&next.every((id,i)=>id===this.selected[i]))return;
  this.selected=next;const selected=new Set(next);let simple=0,detailed=0;
  for(const [i,instance]of this.instances.entries()){
   if(selected.has(i)){this.detail!.setMatrixAt(detailed++,instance.matrix);}
   else{this.fallback.setMatrixAt(simple,instance.matrix);this.fallback.setColorAt(simple++,instance.color);}
  }
  this.fallback.count=simple;this.fallback.instanceMatrix.needsUpdate=true;if(this.fallback.instanceColor)this.fallback.instanceColor.needsUpdate=true;
  if(this.detail){this.detail.count=detailed;this.detail.instanceMatrix.needsUpdate=true;if(detailed)this.detail.computeBoundingSphere();}
 }
 contacts(){return this.visible?this.points.map((p,i)=>({i,d:p.distanceTo(this.eye)})).filter(p=>p.d<16).sort((a,b)=>a.d-b.d||a.i-b.i).slice(0,4).map(p=>this.contactBounds[p.i]):[];}
 snapshot(){return {status:this.status,selected:[...this.selected],detailCount:this.detail?.count??0,simpleCount:this.fallback.count,total:this.instances.length};}
}
