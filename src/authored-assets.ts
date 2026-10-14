import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// One download per asset. Parked/orbital/local-flight clones share GPU resources.
const cache=new Map<'craft'|'station',Promise<THREE.Object3D>>();
export function loadAuthoredAsset(kind:'craft'|'station',actors:THREE.Group[]){
  let asset=cache.get(kind);
  if(!asset){
    const url=kind==='craft'?new URL('./assets/craft.glb',import.meta.url):new URL('./assets/station.glb',import.meta.url);
    asset=new GLTFLoader().loadAsync(url.href).then(gltf=>gltf.scene);cache.set(kind,asset);
  }
  return asset.then(source=>actors.forEach(actor=>{
    const root=source.clone(true);root.name=`authored-${kind}`;
    root.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}});
    for(const child of actor.children)child.visible=false;
    actor.add(root);actor.userData.authored=true;
  }));
}
