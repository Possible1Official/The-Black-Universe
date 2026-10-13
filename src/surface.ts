import * as THREE from 'three';
import {createGroundMaterial,groundTint,GROUND_TILE_METERS} from './terrain-material';
import {LANDING,SAMPLE,SITE_HALF,SURFACE_ORIGIN,terrainHeight,terrainMesh,surfaceRocks} from './excursion';
import {FIELD_SITES,type FieldScan} from './survey';
export function createSurface(){
  const group=new THREE.Group();group.position.x=SURFACE_ORIGIN;group.visible=false;
  const mesh=terrainMesh(),geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(mesh.vertices,3));geometry.setIndex(new THREE.BufferAttribute(mesh.indices,1));geometry.computeVertexNormals();
  const colors=new Float32Array(mesh.vertices.length),uv=new Float32Array(mesh.vertices.length/3*2),normals=geometry.getAttribute('normal');
  for(let i=0;i<colors.length;i+=3){
    const color=groundTint(mesh.vertices[i+1],normals.getY(i/3));colors.set([color.r,color.g,color.b],i);
    uv.set([mesh.vertices[i]/GROUND_TILE_METERS,mesh.vertices[i+2]/GROUND_TILE_METERS],i/3*2);
  }
  geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const groundMaterial=createGroundMaterial();
  const ground=new THREE.Mesh(geometry,groundMaterial.material);ground.receiveShadow=true;group.add(ground);
  const stone=new THREE.MeshStandardMaterial({color:0x4e6360,roughness:.94});
  const rockPlan=surfaceRocks(),rockGeo=new THREE.DodecahedronGeometry(1,0),rocks=new THREE.InstancedMesh(rockGeo,stone,rockPlan.length);
  const transform=new THREE.Object3D(),obstacles:{x:number;y:number;z:number;radius:number}[]=[];
  for(let i=0;i<rockPlan.length;i++){
    const {x,z,radius:r}=rockPlan[i],y=terrainHeight(x,z);
    transform.position.set(x,y+r*.45,z);transform.rotation.set(i*.6,i*.9,i*.23);transform.scale.set(r,r*.8,r);transform.updateMatrix();rocks.setMatrixAt(i,transform.matrix);
    obstacles.push({x:SURFACE_ORIGIN+x,y:y+r*.4,z,radius:r*.65});
  }
  rocks.castShadow=true;rocks.receiveShadow=true;group.add(rocks);
  const grass=new THREE.InstancedMesh(new THREE.ConeGeometry(.12,.75,5),new THREE.MeshStandardMaterial({color:0x61958c,roughness:.9}),240);
  for(let i=0;i<240;i++){const spread=i<180?29:SITE_HALF-4;let x=Math.sin(i*23.3)*spread;const z=Math.cos(i*41.7)*spread;if(Math.hypot(x-LANDING.x,z-LANDING.z)<4)x=-20;transform.position.set(x,terrainHeight(x,z)+.35,z);transform.rotation.set(0,i,0);transform.scale.set(1,1+(i%3)*.3,1);transform.updateMatrix();grass.setMatrixAt(i,transform.matrix);}group.add(grass);
  const glow=new THREE.MeshStandardMaterial({color:0x9cf1df,emissive:0x39cbb2,emissiveIntensity:2,roughness:.3,metalness:.3});
  const sample=new THREE.Group();sample.position.set(SAMPLE.x,terrainHeight(SAMPLE.x,SAMPLE.z),SAMPLE.z);group.add(sample);
  for(let i=0;i<5;i++){const crystal=new THREE.Mesh(new THREE.ConeGeometry(.24,.9+(i%3)*.3,5),glow);crystal.position.set(Math.sin(i)*.55,.65,Math.cos(i)*.55);crystal.rotation.z=(i-2)*.12;sample.add(crystal);}
  const pad=new THREE.Mesh(new THREE.CylinderGeometry(3.5,3.5,.06,32),new THREE.MeshStandardMaterial({color:0x344c59,metalness:.6,roughness:.6}));pad.position.set(LANDING.x,.025,LANDING.z);group.add(pad);
  const padRing=new THREE.Mesh(new THREE.TorusGeometry(3.3,.06,6,48),glow);padRing.rotation.x=Math.PI/2;padRing.position.set(LANDING.x,.09,LANDING.z);group.add(padRing);
  const beacon=new THREE.Group();beacon.position.set(0,0,LANDING.z+2.4);group.add(beacon);
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.12,.16,2.4,8),stone);pole.position.y=1.2;beacon.add(pole);
  const lamp=new THREE.Mesh(new THREE.SphereGeometry(.25,12,8),glow);lamp.position.y=2.4;beacon.add(lamp);
  // Box dimensions drive both visible landmark geometry and Rapier collision.
  const landmarkBoxes:{x:number;y:number;z:number;size:[number,number,number]}[]=[];
  const scanners: {id:FieldScan;position:THREE.Vector3;material:THREE.MeshStandardMaterial;size:[number,number,number]}[]=[];
  for(const site of FIELD_SITES){
    const base=terrainHeight(site.x,site.z),landmark=new THREE.Group();landmark.position.set(site.x,base,site.z);group.add(landmark);
    const block=(x:number,y:number,z:number,size:[number,number,number],material=stone)=>{
      const m=new THREE.Mesh(new THREE.BoxGeometry(...size),material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;landmark.add(m);
      landmarkBoxes.push({x:site.x+x,y:base+y,z:site.z+z,size});
    };
    if(site.id==='arch'){
      block(-2.6,3,0,[1.4,6,1.8]);block(2.6,3,0,[1.4,6,1.8]);block(0,6.3,0,[6.6,.6,1.8]);
      for(const sign of [-1,1]){const line=new THREE.Mesh(new THREE.BoxGeometry(.12,4.8,.06),glow);line.position.set(sign*2.6,3,.94);landmark.add(line);}
    }else{
      block(2,2,0,[.25,4,.25]);block(2,4.1,0,[2.6,.15,.6]);
      const dish=new THREE.Mesh(new THREE.ConeGeometry(.9,.5,16,1,true),stone);dish.position.set(2,3,0);dish.rotation.z=Math.PI/2;landmark.add(dish);
    }
    const material=glow.clone(),size:[number,number,number]=[.7,.9,.5];material.emissiveIntensity=.6;
    const scanner=new THREE.Mesh(new THREE.BoxGeometry(...size),material);scanner.position.set(0,.45,1.4);landmark.add(scanner);
    scanners.push({id:site.id,position:new THREE.Vector3(SURFACE_ORIGIN+site.x,base+.9,site.z+1.4),material,size});
  }
  // Visible basalt perimeter matches the physical survey-site boundary.
  for(const axis of ['x','z'] as const)for(const sign of [-1,1]){
    const wall=new THREE.Mesh(new THREE.BoxGeometry(axis==='x'?2:SITE_HALF*2+2,8,axis==='z'?2:SITE_HALF*2+2),stone);
    wall.position.set(axis==='x'?sign*(SITE_HALF+1):0,2,axis==='z'?sign*(SITE_HALF+1):0);wall.receiveShadow=true;group.add(wall);
  }
  // Distant silhouettes are visual scenery beyond the playable crater.
  for(let i=0;i<16;i++){const mountain=new THREE.Mesh(new THREE.ConeGeometry(26,40+(i%4)*10,5),stone);const a=i*Math.PI/8;mountain.position.set(Math.cos(a)*150,12,Math.sin(a)*150);mountain.rotation.y=i;group.add(mountain);}
  const skyPlanet=new THREE.Mesh(new THREE.SphereGeometry(13,24,16),new THREE.MeshStandardMaterial({color:0x93bfc5,roughness:1}));skyPlanet.position.set(-80,68,-170);group.add(skyPlanet);
  return {group,mesh,obstacles,sample,landmarkBoxes,scanners,setScans(ids:readonly FieldScan[]){for(const s of scanners)s.material.emissiveIntensity=ids.includes(s.id)?1.8:.6;},setQuality:groundMaterial.setQuality,materialSnapshot:groundMaterial.snapshot};
}
