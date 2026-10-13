import * as THREE from 'three';
import {NYSA_CENTER,NYSA_RADIUS,flightGoal,type FlightState} from './flight';
export function makeShuttle(){
  const root=new THREE.Group(),hull=new THREE.MeshStandardMaterial({color:0x344655,metalness:.7,roughness:.35}),trim=new THREE.MeshStandardMaterial({color:0xd0d8d8,metalness:.6,roughness:.4}),glow=new THREE.MeshBasicMaterial({color:0x67e6ff});
  const box=(w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.Material)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);return mesh;};
  box(1.8,.9,5,0,.8,0,hull);box(1.2,.45,1.8,0,.85,-3,trim);box(7,.16,2.3,0,.5,.8,hull);
  box(.18,1.7,1.7,0,1.7,1.6,trim);
  const canopy=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),new THREE.MeshPhysicalMaterial({color:0x082939,metalness:.3,roughness:.1}));canopy.position.set(0,1.25,-.9);canopy.scale.set(.8,.7,1.5);root.add(canopy);
  for(const side of [-1,1]){box(.65,.7,3,side*2.2,.65,1,hull);box(.5,.45,.07,side*2.2,.65,2.55,glow);box(.25,.5,1.2,side*1.1,.15,-1,trim);box(.25,.5,1.2,side*1.1,.15,1.5,trim);}
  return root;
}
export function createFlightScene(camera:THREE.PerspectiveCamera,planetMaterial:THREE.Material,cloudTexture:THREE.Texture){
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x01040b);scene.add(camera);
  scene.add(new THREE.HemisphereLight(0xa3ccf2,0x0c1325,2));const sun=new THREE.DirectionalLight(0xffe9cd,3);sun.position.set(-200,300,100);scene.add(sun);
  const metal=new THREE.MeshStandardMaterial({color:0x223646,metalness:.75,roughness:.4}),light=new THREE.MeshBasicMaterial({color:0x77e6ee});
  const station=new THREE.Group();scene.add(station);
  const block=(w:number,h:number,d:number,x:number,y:number,z:number,mat:THREE.Material=metal,parent:THREE.Object3D=station)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);parent.add(m);return m;};
  block(62,8,85,0,-9,10);block(62,8,85,0,9,10);block(10,18,85,-28,0,10);block(10,18,85,28,0,10);block(62,18,5,0,0,52);
  for(const x of [-22,22])block(1,12,1,x,0,-32,light);
  for(const x of [-45,45]){block(25,12,45,x,0,20);block(23,.4,2,x,6.3,20,light);}
  const planet=new THREE.Mesh(new THREE.SphereGeometry(NYSA_RADIUS,64,40),planetMaterial);planet.position.copy(NYSA_CENTER);scene.add(planet);
  const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(NYSA_RADIUS+5,48,32),new THREE.MeshBasicMaterial({color:0x67b7e9,transparent:true,opacity:.12,side:THREE.BackSide}));atmosphere.position.copy(NYSA_CENTER);scene.add(atmosphere);
  const clouds=new THREE.Mesh(new THREE.SphereGeometry(NYSA_RADIUS+2,48,32),new THREE.MeshStandardMaterial({map:cloudTexture,transparent:true,opacity:.8,roughness:1,depthWrite:false}));clouds.position.copy(NYSA_CENTER);scene.add(clouds);
  const forge=new THREE.Group();forge.position.set(430,120,-550);scene.add(forge);
  for(let i=0;i<4;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(90+i*24,2,8,96),i%2?metal:light);ring.rotation.set(i*.6,i*.4,i);forge.add(ring);}
  forge.add(new THREE.Mesh(new THREE.IcosahedronGeometry(35,1),new THREE.MeshBasicMaterial({color:0xa9efff,wireframe:true})));
  const stars=new Float32Array(1800*3);let seed=904;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  for(let i=0;i<1800;i++){const a=rand()*Math.PI*2,b=Math.acos(rand()*2-1),r=2100;stars.set([Math.cos(a)*Math.sin(b)*r,Math.cos(b)*r,Math.sin(a)*Math.sin(b)*r],i*3);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(stars,3));scene.add(new THREE.Points(geo,new THREE.PointsMaterial({color:0xbdd7ed,size:2})));
  const marker=new THREE.Mesh(new THREE.TorusGeometry(14,.4,8,48),light);scene.add(marker);
  // Camera-local cockpit gives a readable first-person vehicle view without obscuring the target.
  const cockpit=new THREE.Group();camera.add(cockpit);
  const dashboard=block(2.2,.2,.7,0,-.65,-1.2,metal,cockpit);dashboard.rotation.x=.12;
  block(.8,.035,.28,0,-.53,-1.3,light,cockpit);for(const x of [-.85,.85]){const strut=block(.07,1.6,.07,x,.05,-1.2,metal,cockpit);strut.rotation.z=x*.15;}
  cockpit.visible=false;
  return {scene,cockpit,update(f:FlightState,dt:number){marker.position.copy(flightGoal(f));marker.rotation.z+=dt*.3;clouds.rotation.y+=dt*.015;forge.rotation.y+=dt*.04;cockpit.visible=true;camera.position.copy(f.position);camera.updateMatrixWorld();},hide(){cockpit.visible=false;}};
}
