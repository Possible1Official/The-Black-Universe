import * as THREE from 'three';
import {flightGoal,canApproach,type FlightState} from './flight';
import {STATION_HULL,STATION_ASSEMBLY} from './station';
import {attachRequested} from './requested-assets';
import {LAUNCH_BAY} from './launch-layout';
import {createRunwayShell} from './runway-shell';
import {SPACE_COLOR} from './shared-space';
import {loadAuthoredAsset} from './authored-assets';
export function makeShuttle(){
  const root=new THREE.Group(),hull=new THREE.MeshStandardMaterial({color:0x344655,metalness:.7,roughness:.35}),trim=new THREE.MeshStandardMaterial({color:0xd0d8d8,metalness:.6,roughness:.4}),glow=new THREE.MeshBasicMaterial({color:0x67e6ff});
  const box=(w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.Material)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);return mesh;};
  box(1.8,.9,5,0,.8,0,hull);box(1.2,.45,1.8,0,.85,-3,trim);box(7,.16,2.3,0,.5,.8,hull);
  box(.18,1.7,1.7,0,1.7,1.6,trim);
  const canopy=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),new THREE.MeshPhysicalMaterial({color:0x082939,metalness:.3,roughness:.1}));canopy.position.set(0,1.25,-.9);canopy.scale.set(.8,.7,1.5);root.add(canopy);
  for(const side of [-1,1]){box(.65,.7,3,side*2.2,.65,1,hull);box(.5,.45,.07,side*2.2,.65,2.55,glow);box(.25,.5,1.2,side*1.1,.15,-1,trim);box(.25,.5,1.2,side*1.1,.15,1.5,trim);}
  return root;
}
export function createFlightScene(camera:THREE.PerspectiveCamera){
  const scene=new THREE.Scene();scene.background=new THREE.Color(SPACE_COLOR);scene.add(camera);
  scene.add(new THREE.HemisphereLight(0xa3ccf2,0x60798c,2));const sun=new THREE.DirectionalLight(0xffe9cd,3);sun.position.set(-200,300,-200);scene.add(sun);
  const metal=new THREE.MeshStandardMaterial({color:0x223646,metalness:.75,roughness:.4}),light=new THREE.MeshBasicMaterial({color:0x77e6ee});
  const station=new THREE.Group();scene.add(station);
  const block=(w:number,h:number,d:number,x:number,y:number,z:number,mat:THREE.Material=metal,parent:THREE.Object3D=station)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);parent.add(m);return m;};
  for(const b of STATION_HULL)block(b.size[0],b.size[1],b.size[2],b.position[0],b.position[1],b.position[2]);
  const habitat=new THREE.Group();habitat.position.set(STATION_ASSEMBLY.position[0],STATION_ASSEMBLY.position[1]-STATION_ASSEMBLY.size[1]/2,STATION_ASSEMBLY.position[2]);station.add(habitat);
  block(88,28,120,0,14,0,metal,habitat);
  const runway=new THREE.Group();runway.position.set(0,0,LAUNCH_BAY.centerZ);station.add(runway,createRunwayShell());attachRequested('corridor',runway).catch(()=>console.warn('Orbital runway asset unavailable'));
  const craft=makeShuttle();scene.add(craft);craft.visible=false;
  for(const x of [-22,22])block(1,12,1,x,0,-32,light);
  for(const x of [-45,45])block(23,.4,2,x,6.3,20,light);
  for(const x of [-8,0,8])block(.2,.04,28,x,-4.96,-14,light);
  const gateGeometry=new THREE.TorusGeometry(14,.4,8,48),gateMaterial=new THREE.MeshBasicMaterial({color:0x77e6ee});
  const gates=Array.from({length:3},(_,i)=>{const gate=new THREE.Mesh(gateGeometry,gateMaterial);gate.scale.setScalar(1+i*.3);scene.add(gate);return gate;});
  // Camera-local cockpit gives a readable first-person vehicle view without obscuring the target.
  const cockpit=new THREE.Group();camera.add(cockpit);
  const dashboard=block(2.2,.2,.7,0,-.65,-1.2,metal,cockpit);dashboard.rotation.x=.12;
  block(.8,.035,.28,0,-.53,-1.3,light,cockpit);for(const x of [-.85,.85]){const strut=block(.07,1.6,.07,x,.05,-1.2,metal,cockpit);strut.rotation.z=x*.15;}
  cockpit.visible=false;
  return {scene,cockpit,craft,habitat,gates,loadCockpit(){return attachRequested('cockpit',cockpit);},loadHabitat(){return loadAuthoredAsset('station',[habitat]);},update(f:FlightState,dt:number,brakeNow=false){
    const goal=flightGoal(f),outward=f.leg==='nysa'?1:-1;
    gates.forEach((gate,i)=>{gate.position.set(goal.x,goal.y,goal.z+outward*i*50);gate.rotation.z+=dt*.3;});
    gateMaterial.color.setHex(canApproach(f)?0x83f0c1:brakeNow?0xffbb72:0x77e6ee);
    cockpit.visible=true;camera.position.copy(f.position);camera.updateMatrixWorld();
  },hide(){cockpit.visible=false;craft.visible=false;}};
}
