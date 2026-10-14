import * as THREE from 'three';
/** Generated scenic backdrop, separate from simulated terrain and flight space. */
export function createWindowVista(){
 const group=new THREE.Group();group.name='Generated window vista';
 const material=new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false});
 const add=(w:number,h:number,x:number,y:number,z:number,angle=0)=>{const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);mesh.position.set(x,y,z);mesh.rotation.y=angle;group.add(mesh);};
 // Far bow backdrop leaves the real forge in front. Cabin panels sit beyond glass.
 add(600,216,0,8,-320);
 for(const side of [-1,1])add(8,3,side*4.65,2.25,34.825,side===1?-Math.PI/2:Math.PI/2);
 add(8,3,0,2.25,39.6,Math.PI);
 new THREE.TextureLoader().load(new URL('./assets/window-vista.webp',import.meta.url).href,texture=>{texture.colorSpace=THREE.SRGBColorSpace;material.map=texture;material.needsUpdate=true;group.userData.loaded=true;},undefined,()=>console.warn('Window panorama unavailable'));
 return group;
}
export function clearCabinGlazing(root:THREE.Object3D){root.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const materials=Array.isArray(o.material)?o.material:[o.material];for(const m of materials)if(m instanceof THREE.MeshStandardMaterial&&m.name.includes('Cabin_glass')){m.transparent=true;m.opacity=.12;m.metalness=0;m.roughness=.08;m.depthWrite=false;m.side=THREE.DoubleSide;m.needsUpdate=true;}});}
