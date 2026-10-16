import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type {GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {requestedAsset,attachRequested} from './requested-assets';
import {meshColliders} from './mesh-colliders';
import {OUTPOST,REPAIR_SITES,type RepairId,type RelayNetwork} from './relay-expedition';

const loadKit=()=>requestedAsset('corridor');
export type RelayTerminalId=RepairId|'uplink';
/** Reuses the reviewed kit/maps; simple shell stays playable if loading fails. */
export class RelayOutpost{
 readonly root=new THREE.Group();
 readonly terminals:{id:RelayTerminalId;label:string;position:THREE.Vector3;mesh:THREE.Mesh;collider?:RAPIER.Collider}[]=[];
 private readonly solids:THREE.Mesh[]=[];private world?:RAPIER.World;
 private readonly amber=new THREE.Color(0xffb85c);private readonly green=new THREE.Color(0x74ead3);
 private readonly antenna=new THREE.Group();private online=false;private elapsed=0;
 private attempted=false;private pending?:Promise<void>;private loaded=false;
 private readonly kit=new THREE.Group();private readonly cargo:THREE.Group[]=[];
 private readonly floor:THREE.Mesh;private floorCollider?:RAPIER.Collider;
 private readonly status:THREE.MeshBasicMaterial;
 private readonly lamp=new THREE.PointLight(0xb9dce9,65,13,2);
 private readonly screens=new Map<RelayTerminalId,{canvas:HTMLCanvasElement;map:THREE.CanvasTexture;done?:boolean}>();
 constructor(ground:(x:number,z:number)=>number,private readonly origin=0){
  this.root.name='Nysa relay expedition';
  const shell=new THREE.MeshStandardMaterial({color:0x304655,metalness:.45,roughness:.65}),trim=new THREE.MeshStandardMaterial({color:0x78878a,metalness:.45,roughness:.55});
  this.status=new THREE.MeshBasicMaterial({color:this.amber});
  const box=(parent:THREE.Object3D,size:[number,number,number],at:[number,number,number],material:THREE.Material=shell,solid=true)=>{
   const m=new THREE.Mesh(new THREE.BoxGeometry(...size),material);m.position.set(...at);m.castShadow=m.receiveShadow=true;parent.add(m);if(solid)this.solids.push(m);return m;
  };
  const terminal=(id:RelayTerminalId,label:string,x:number,y:number,z:number)=>{
   const material=new THREE.MeshStandardMaterial({color:0x304553,metalness:.3,roughness:.65,emissive:0x183341,emissiveIntensity:.08});
   const mesh=box(this.root,[.85,.85,.5],[x,y+.425,z],material);
   const screen=new THREE.MeshBasicMaterial({color:this.amber});
   if(typeof document!=='undefined'){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;screen.map=map;screen.color.setHex(0xffffff);this.screens.set(id,{canvas,map});}
   box(mesh,[.7,.35,.035],[0,.15,.267],screen,false);
   this.terminals.push({id,label,mesh,position:new THREE.Vector3(this.origin+x,y+1,z+.28)});
  };
  const building=new THREE.Group();building.position.set(OUTPOST.x,0,OUTPOST.z);this.root.add(building);
  this.lamp.position.set(0,2.8,-.3);this.lamp.visible=false;building.add(this.lamp);
  this.floor=box(building,[9.6,.18,8.4],[0,-.115,0]);
  box(building,[.3,4.2,8.4],[-4.75,1.95,0]);box(building,[.3,4.2,8.4],[4.75,1.95,0]);
  box(building,[9.8,.25,8.6],[0,4.1,0]);box(building,[9.6,4.2,.3],[0,1.95,-4.15]);
  // An open front: no doorway shoulder, step or invisible door to bypass.
  box(building,[8,.09,.07],[0,3.5,4.06],this.status,false);
  terminal('uplink','Activate outpost uplink',OUTPOST.x,0,OUTPOST.z-2.7);
  const labelCanvas=typeof document==='undefined'?undefined:document.createElement('canvas');
  if(labelCanvas){labelCanvas.width=512;labelCanvas.height=128;const c=labelCanvas.getContext('2d')!;c.fillStyle='#15232d';c.fillRect(0,0,512,128);c.fillStyle='#e8f3ef';c.font='bold 32px system-ui';c.fillText('NYSA / RELAY 03',32,52);c.font='22px system-ui';c.fillStyle='#ffc582';c.fillText('COMMUNICATIONS OUTPOST',32,94);const map=new THREE.CanvasTexture(labelCanvas);map.colorSpace=THREE.SRGBColorSpace;box(building,[4.8,1.2,.045],[0,2.75,4.2],new THREE.MeshBasicMaterial({map}),false);}
  box(building,[.2,1.3,.2],[2,4.85,0],trim);
  this.antenna.position.set(2,5.6,0);building.add(this.antenna);
  const dish=new THREE.Mesh(new THREE.SphereGeometry(1.2,20,10,0,Math.PI*2,0,Math.PI*.38),trim);dish.rotation.x=-Math.PI*.3;this.antenna.add(dish);
  box(this.antenna,[.09,.09,1.6],[0,.25,-.4],trim,false);
  box(this.antenna,[.12,.12,.12],[0,.25,-1.2],this.status,false);
  this.root.add(this.kit);
  for(const site of REPAIR_SITES){
   const base=ground(site.x,site.z),mast=new THREE.Group();mast.position.set(site.x,base,site.z);this.root.add(mast);
   box(mast,[.24,4.2,.24],[1.3,2.05,0],trim);box(mast,[2.3,.18,.3],[1.3,4.2,0],trim);
   for(const side of [-1,1])box(mast,[.55,.9,.09],[1.3+side*.7,3.6,0],shell);
   terminal(site.id,'Repair '+site.label.toLowerCase(),site.x,ground(site.x,site.z+1.4),site.z+1.4);
   const cargo=new THREE.Group();cargo.position.set(site.x-1.5,ground(site.x-1.5,site.z),site.z);this.root.add(cargo);this.cargo.push(cargo);
   box(cargo,[1.25,.6,1],[0,.3,0],trim); // Same bounded crate footprint after import.
  }
 }
 init(world:RAPIER.World){
  if(this.world)return;this.world=world;this.root.updateWorldMatrix(true,true);
  for(const mesh of this.solids){const bounds=new THREE.Box3().setFromObject(mesh),size=bounds.getSize(new THREE.Vector3()).multiplyScalar(.5),center=bounds.getCenter(new THREE.Vector3());
   const collider=world.createCollider(RAPIER.ColliderDesc.cuboid(size.x,size.y,size.z).setTranslation(center.x,center.y,center.z));
   if(mesh===this.floor)this.floorCollider=collider;const terminal=this.terminals.find(t=>t.mesh===mesh);if(terminal)terminal.collider=collider;
  }
  if(this.loaded){meshColliders(world,this.kit);this.floorCollider?.setEnabled(false);}
 }
 /** Assign dependencies once from the app; Node fixtures can supply a kit. */
 load(retry=false,loader:()=>Promise<GLTF>=loadKit):Promise<void>|undefined{
  if(this.pending)return this.pending;if(this.loaded||(this.attempted&&!retry))return;this.attempted=true;
  this.pending=loader().then(asset=>{
   const source=asset.scene.children.find(o=>o.name==='Erebus_Runway_Segment_0');if(!source)throw Error('Missing straight kit cell');
   // Keep the authored deck above the flat terrain: one visible floor owner.
   for(const z of [-2,2]){const cell=source.clone(true);cell.position.set(OUTPOST.x,.04,OUTPOST.z+z);cell.scale.set(OUTPOST.width/3.5,OUTPOST.height/3.4,1);cell.traverse(o=>{if(o instanceof THREE.Mesh)o.castShadow=o.receiveShadow=true;});this.kit.add(cell);}
   if(this.world){const colliders=meshColliders(this.world,this.kit);if(!colliders.length)throw Error('Empty outpost collision');this.floorCollider?.setEnabled(false);}
   this.floor.visible=false;this.loaded=true;
  }).catch(()=>{this.kit.clear();console.warn('Outpost kit unavailable; fitted shell retained.');}).finally(()=>{this.pending=undefined;});
  // Crates are independent decoration. A partial import never changes gameplay.
  if(this.world&&loader===loadKit)for(const cargo of this.cargo)void attachRequested('cargo',cargo).catch(()=>{});
  return this.pending;
 }
 setState(network:RelayNetwork){
  this.online=network.online;this.status.color.copy(this.online?this.green:this.amber);
  for(const t of this.terminals){
   const done=t.id==='uplink'?network.online:network.repairs.includes(t.id),color=done?this.green:this.amber,screen=this.screens.get(t.id);
   if(screen&&screen.done!==done){screen.done=done;const c=screen.canvas.getContext('2d')!;c.fillStyle='#10232d';c.fillRect(0,0,256,128);c.fillStyle=done?'#74ead3':'#ffb85c';c.fillRect(12,12,232,4);c.font='bold 22px system-ui';c.fillText(t.id==='uplink'?'RELAY 03 / UPLINK':t.id.toUpperCase()+' RECEIVER',12,48);c.font='18px system-ui';c.fillText(done?'ONLINE':'CARRIER OFFLINE',12,80);c.fillStyle='#b9ced7';c.font='15px system-ui';c.fillText(t.id==='uplink'?'E / OPEN ARCHIVE':'E / REPAIR COUPLER',12,110);screen.map.needsUpdate=true;}
   if(!screen)(t.mesh.children[0] as THREE.Mesh<THREE.BoxGeometry,THREE.MeshBasicMaterial>).material.color.copy(color);
  }
 }
 update(dt:number,active:boolean,observer?:THREE.Vector3){
  if(observer){const distance=Math.hypot(observer.x-this.origin-OUTPOST.x,observer.z-OUTPOST.z);this.lamp.visible=distance<(this.lamp.visible?28:24);}
  if(!active||!this.online||!Number.isFinite(dt)||dt<=0)return;this.elapsed+=Math.min(dt,.25);this.antenna.rotation.y=this.elapsed*.16;
 }
 snapshot(){return {loaded:this.loaded,online:this.online,antenna:this.antenna.rotation.y};}
}
