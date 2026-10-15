import * as THREE from 'three';
import {GLTFLoader,type GLTF} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {decodeGameResource} from './game-resource';
export type RequestedAsset='biker'|'bike'|'rover'|'corridor'|'bedroom'|'interior'|'cockpit'|'ship'|'resident'|'cargo';
const cache=new Map<RequestedAsset,Promise<GLTF>>();
// Literal URLs let Vite fingerprint the private-source derivatives independently.
const url:Record<RequestedAsset,string>={cargo:new URL('./assets/requested/cargo.ebup',import.meta.url).href,resident:new URL('./assets/requested/resident.ebup',import.meta.url).href,biker:new URL('./assets/requested/biker.ebup',import.meta.url).href,bike:new URL('./assets/requested/bike.ebup',import.meta.url).href,rover:new URL('./assets/requested/rover.ebup',import.meta.url).href,corridor:new URL('./assets/requested/corridor.ebup',import.meta.url).href,bedroom:new URL('./assets/requested/bedroom.ebup',import.meta.url).href,interior:new URL('./assets/requested/interior.ebup',import.meta.url).href,cockpit:new URL('./assets/requested/cockpit.ebup',import.meta.url).href,ship:new URL('./assets/requested/ship.ebup',import.meta.url).href};
export function requestedAsset(kind:RequestedAsset){
 let asset=cache.get(kind);if(!asset){const pending=fetch(url[kind]).then(async r=>{if(!r.ok)throw Error('Game resource unavailable');const data=await decodeGameResource(await r.arrayBuffer());return new GLTFLoader().parseAsync(data,'');}).catch(e=>{if(cache.get(kind)===pending)cache.delete(kind);throw e;});cache.set(kind,pending);asset=pending;}return asset;
}
export async function attachRequested(kind:RequestedAsset,actor:THREE.Group,replace=true){
 const gltf=await requestedAsset(kind);if(actor.children.some(c=>c.name==='requested-'+kind))return;
 const root=clone(gltf.scene);root.name='requested-'+kind;root.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}});
 if(replace)for(const c of actor.children)c.visible=false;actor.add(root);actor.userData.requested=kind;return root;
}
