import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {requestedAsset} from './requested-assets';

export type AuthoredAsset='craft'|'station';
// Successful downloads stay shared; failures may retry on the next explicit flight.
export function createAuthoredAssetLoader(load:(kind:AuthoredAsset)=>Promise<THREE.Object3D>){
  const cache=new Map<AuthoredAsset,Promise<THREE.Object3D>>();
  return (kind:AuthoredAsset,actors:THREE.Group[])=>{
    let asset=cache.get(kind);
    if(!asset){
      const pending=Promise.resolve().then(()=>load(kind)).catch(error=>{
        if(cache.get(kind)===pending)cache.delete(kind);
        throw error;
      });
      cache.set(kind,pending);asset=pending;
    }
    return asset.then(source=>actors.forEach(actor=>{
      const name=`authored-${kind}`;
      if(actor.children.some(child=>child.name===name))return;
      const root=source.clone(true);root.name=name;
      root.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}});
      for(const child of actor.children)child.visible=false;
      actor.add(root);actor.userData.authored=true;
    }));
  };
}
// One download per successful asset. Clones share geometry, materials and maps.
export const loadAuthoredAsset=createAuthoredAssetLoader(async kind=>{
  if(kind==='craft')return (await requestedAsset('ship')).scene;
  const url=new URL('./assets/station.glb',import.meta.url);
  return (await new GLTFLoader().loadAsync(url.href)).scene;
});
