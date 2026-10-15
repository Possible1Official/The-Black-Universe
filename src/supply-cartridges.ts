import * as THREE from 'three';
import {attachRequested} from './requested-assets';
export const CARTRIDGE_LAYOUT={offset:.2,rackScale:1.2,rackY:.28,fieldScale:.65,fieldX:-.21,fieldY:.08,fieldZ:-.08} as const;
const fallbackGeometry=new THREE.CylinderGeometry(.12,.12,.7,12);
const fallbackMaterial=new THREE.MeshStandardMaterial({color:0xc3c9c8,metalness:.35,roughness:.65});
/** Two cosmetic slots driven by saved supply state; no independent inventory. */
export class SupplyCartridges{
 readonly root=new THREE.Group();private slots:THREE.Group[]=[];private attempted=false;private pending?:Promise<void>;
 constructor(private readonly loader:(slot:THREE.Group)=>Promise<unknown>=slot=>attachRequested('canister',slot)){
  for(const x of [-CARTRIDGE_LAYOUT.offset,CARTRIDGE_LAYOUT.offset]){const slot=new THREE.Group();slot.position.x=x;slot.rotation.y=-Math.PI/2;const fallback=new THREE.Mesh(fallbackGeometry,fallbackMaterial);fallback.position.y=.36;slot.add(fallback);this.slots.push(slot);this.root.add(slot);}
 }
 get loaded(){return this.slots.every(slot=>slot.userData.requested==='canister');}
 setCount(count:number){const n=Number.isFinite(count)?THREE.MathUtils.clamp(Math.floor(count),0,2):0;this.slots.forEach((slot,i)=>slot.visible=i<n);}
 load(retry=false):Promise<void>|undefined{
  if(this.pending)return this.pending;
  if(this.loaded||(this.attempted&&!retry)||!this.slots.some(slot=>slot.visible))return;
  this.attempted=true;
  // Slot visibility belongs to setCount. An import completing late must never
  // bring back a consumed/recovered cartridge or replace the enclosing rack.
  this.pending=Promise.all(this.slots.map(slot=>this.loader(slot))).then(()=>{}).catch(()=>console.warn('Coolant cartridge asset unavailable; fitted fallback retained.')).finally(()=>{this.pending=undefined;});
  return this.pending;
 }
}
