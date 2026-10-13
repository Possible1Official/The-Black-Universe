import * as THREE from 'three';
import {createGroundMaterial,groundTint,GROUND_TILE_METERS} from './terrain-material';
import {LANDING,SAMPLE,SITE_HALF,SURFACE_ORIGIN,terrainHeight,terrainMesh} from './excursion';
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
  const rockGeo=new THREE.DodecahedronGeometry(1,0),rocks=new THREE.InstancedMesh(rockGeo,stone,64);
  const transform=new THREE.Object3D(),obstacles:{x:number;y:number;z:number;radius:number}[]=[];
  for(let i=0;i<64;i++){
    let x=Math.sin(i*127.1+3)*29,z=Math.cos(i*311.7+7)*29;
    // Keep the landing pad, sample and direct walking corridor unobstructed.
    if(Math.hypot(x-LANDING.x,z-LANDING.z)<6||Math.hypot(x-SAMPLE.x,z-SAMPLE.z)<4||Math.abs(x-9*(20-z)/29)<2.5)x=-24-i%4;
    const r=.35+(i%7)*.12,y=terrainHeight(x,z);
    transform.position.set(x,y+r*.45,z);transform.rotation.set(i*.6,i*.9,i*.23);transform.scale.set(r,r*.8,r);transform.updateMatrix();rocks.setMatrixAt(i,transform.matrix);
    obstacles.push({x:SURFACE_ORIGIN+x,y:y+r*.4,z,radius:r*.65});
  }
  rocks.castShadow=true;rocks.receiveShadow=true;group.add(rocks);
  const grass=new THREE.InstancedMesh(new THREE.ConeGeometry(.12,.75,5),new THREE.MeshStandardMaterial({color:0x61958c,roughness:.9}),180);
  for(let i=0;i<180;i++){let x=Math.sin(i*23.3)*29;const z=Math.cos(i*41.7)*29;if(Math.hypot(x-LANDING.x,z-LANDING.z)<4)x=-20;transform.position.set(x,terrainHeight(x,z)+.35,z);transform.rotation.set(0,i,0);transform.scale.set(1,1+(i%3)*.3,1);transform.updateMatrix();grass.setMatrixAt(i,transform.matrix);}group.add(grass);
  const glow=new THREE.MeshStandardMaterial({color:0x9cf1df,emissive:0x39cbb2,emissiveIntensity:2,roughness:.3,metalness:.3});
  const sample=new THREE.Group();sample.position.set(SAMPLE.x,terrainHeight(SAMPLE.x,SAMPLE.z),SAMPLE.z);group.add(sample);
  for(let i=0;i<5;i++){const crystal=new THREE.Mesh(new THREE.ConeGeometry(.24,.9+(i%3)*.3,5),glow);crystal.position.set(Math.sin(i)*.55,.65,Math.cos(i)*.55);crystal.rotation.z=(i-2)*.12;sample.add(crystal);}
  const pad=new THREE.Mesh(new THREE.CylinderGeometry(3.5,3.5,.06,32),new THREE.MeshStandardMaterial({color:0x344c59,metalness:.6,roughness:.6}));pad.position.set(LANDING.x,.025,LANDING.z);group.add(pad);
  const padRing=new THREE.Mesh(new THREE.TorusGeometry(3.3,.06,6,48),glow);padRing.rotation.x=Math.PI/2;padRing.position.set(LANDING.x,.09,LANDING.z);group.add(padRing);
  const beacon=new THREE.Group();beacon.position.set(0,0,LANDING.z+2.4);group.add(beacon);
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.12,.16,2.4,8),stone);pole.position.y=1.2;beacon.add(pole);
  const lamp=new THREE.Mesh(new THREE.SphereGeometry(.25,12,8),glow);lamp.position.y=2.4;beacon.add(lamp);
  // Visible basalt perimeter matches the physical survey-site boundary.
  for(const axis of ['x','z'] as const)for(const sign of [-1,1]){
    const wall=new THREE.Mesh(new THREE.BoxGeometry(axis==='x'?2:SITE_HALF*2+2,8,axis==='z'?2:SITE_HALF*2+2),stone);
    wall.position.set(axis==='x'?sign*(SITE_HALF+1):0,2,axis==='z'?sign*(SITE_HALF+1):0);wall.receiveShadow=true;group.add(wall);
  }
  // Distant silhouettes are visual scenery beyond the playable crater.
  for(let i=0;i<16;i++){const mountain=new THREE.Mesh(new THREE.ConeGeometry(18,30+(i%4)*10,5),stone);const a=i*Math.PI/8;mountain.position.set(Math.cos(a)*100,10,Math.sin(a)*100);mountain.rotation.y=i;group.add(mountain);}
  const skyPlanet=new THREE.Mesh(new THREE.SphereGeometry(13,24,16),new THREE.MeshStandardMaterial({color:0x93bfc5,roughness:1}));skyPlanet.position.set(-80,68,-170);group.add(skyPlanet);
  return {group,mesh,obstacles,sample,setQuality:groundMaterial.setQuality,materialSnapshot:groundMaterial.snapshot};
}
