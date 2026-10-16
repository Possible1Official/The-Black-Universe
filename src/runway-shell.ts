import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {LAUNCH_BAY,RUNWAY_CLEAR_WIDTH} from './launch-layout';
// Render and collision share these boxes, including both shoulders of the door.
export const RUNWAY_SHELL=[
 {name:'Runway deck',size:[RUNWAY_CLEAR_WIDTH+.3,.2,24.5],at:[0,-.1,-31.1]},
 {name:'Port runway wall',size:[.3,5.8,24.5],at:[-(RUNWAY_CLEAR_WIDTH/2+.15),2.9,-31.1]},
 {name:'Starboard runway wall',size:[.3,5.8,24.5],at:[RUNWAY_CLEAR_WIDTH/2+.15,2.9,-31.1]},
 {name:'Runway roof',size:[RUNWAY_CLEAR_WIDTH+.6,.3,24.5],at:[0,5.65,-31.1]},
 {name:'Inner port bulkhead',size:[(RUNWAY_CLEAR_WIDTH+.6-3.4)/2,5.8,.4],at:[-(RUNWAY_CLEAR_WIDTH+.6+3.4)/4,2.9,LAUNCH_BAY.innerZ]},
 {name:'Inner starboard bulkhead',size:[(RUNWAY_CLEAR_WIDTH+.6-3.4)/2,5.8,.4],at:[(RUNWAY_CLEAR_WIDTH+.6+3.4)/4,2.9,LAUNCH_BAY.innerZ]},
 {name:'Inner door header',size:[3.4,2.4,.4],at:[0,4.6,LAUNCH_BAY.innerZ]},
] as const;
export function createRunwayShell(){
 const root=new THREE.Group();root.name='Sealed runway structure';
 const metal=new THREE.MeshStandardMaterial({color:0x253541,metalness:.55,roughness:.54});
 for(const part of RUNWAY_SHELL){const mesh=new THREE.Mesh(new THREE.BoxGeometry(...part.size),metal);mesh.name=part.name;mesh.position.set(part.at[0],part.at[1],part.at[2]);if(part.name==='Runway deck')mesh.position.y-=.025;mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);}
 return root;
}
export function runwayShellColliders(world:RAPIER.World){return RUNWAY_SHELL.map(p=>world.createCollider(RAPIER.ColliderDesc.cuboid(p.size[0]/2,p.size[1]/2,p.size[2]/2).setTranslation(p.at[0],p.at[1],p.at[2])));}
