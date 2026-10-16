import {test} from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';import {RockScenery,selectDetailedRocks} from '../src/rock-scenery';
test('rock detail is bounded by quality, full 3D distance and hysteresis',()=>{
 const points=Array.from({length:35},(_,i)=>new THREE.Vector3(i,0,0));assert.equal(selectDetailedRocks(points,new THREE.Vector3(),false).length,12);assert.equal(selectDetailedRocks(points,new THREE.Vector3(),true).length,20);assert.equal(selectDetailedRocks(points,new THREE.Vector3(0,100,0),true).length,0);
 const edge=[new THREE.Vector3(25,0,0)];assert.deepEqual(selectDetailedRocks(edge,new THREE.Vector3(),false),[]);assert.deepEqual(selectDetailedRocks(edge,new THREE.Vector3(),false,[0]),[0]);assert.deepEqual(selectDetailedRocks(edge,new THREE.Vector3(-4,0,0),false,[0]),[]);
});
test('fallback survives failed loading; explicit retry is deduplicated and every rock renders once through quality/exit changes',async()=>{
 const source={geometry:new THREE.SphereGeometry(1,6,4),material:new THREE.MeshStandardMaterial()},fallback=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(),new THREE.MeshStandardMaterial(),30),instances=Array.from({length:30},(_,i)=>({matrix:new THREE.Matrix4().makeTranslation(i,0,0),color:new THREE.Color(i/30,.4,.5)}));instances.forEach((p,i)=>{fallback.setMatrixAt(i,p.matrix);fallback.setColorAt(i,p.color);});let calls=0;const scenery=new RockScenery(fallback,instances,async()=>{if(++calls===1)throw Error('fixture unavailable');return source;});
 assert.equal(await scenery.load(),false);scenery.update(new THREE.Vector3(),true,true);assert.equal(scenery.snapshot().simpleCount,30);assert.equal(await scenery.load(),false);assert.equal(calls,1);const a=scenery.load(true),b=scenery.load(true);assert.equal(a,b);assert.equal(await a,true);assert.equal(calls,2);
 for(const high of [false,true,false]){scenery.update(new THREE.Vector3(8,0,0),high,true);const s=scenery.snapshot();assert.equal(s.detailCount,high?20:12);assert.equal(s.simpleCount+s.detailCount,30);const detail=scenery.root.children.find(o=>o.name==='ScannedRockInstances') as THREE.InstancedMesh;assert.equal(detail.geometry,source.geometry);assert.equal(detail.material,source.material);for(const [slot,id]of s.selected.entries()){const matrix=new THREE.Matrix4();detail.getMatrixAt(slot,matrix);assert.deepEqual(matrix,instances[id].matrix);}}
 scenery.update(new THREE.Vector3(),true,false);assert.equal(scenery.snapshot().detailCount,0);assert.equal(scenery.snapshot().simpleCount,30);await scenery.load(true);assert.equal(calls,2);
});

test('shipped static rock meets its map/mesh budget and coarse hull uses source support points',async()=>{
 const {readFileSync}=await import('node:fs'),{decodeGameResource}=await import('../src/game-resource'),{ROCK_HULL_VERTICES,ROCK_HULL_INDICES}=await import('../src/rock-hull');
 const b=Buffer.from(await decodeGameResource(Uint8Array.from(readFileSync(new URL('../src/assets/requested/rock.ebup',import.meta.url))).buffer)),n=b.readUInt32LE(12),g=JSON.parse(b.subarray(20,20+n).toString()),binary=b.subarray(28+n),primitive=g.meshes[0].primitives[0];assert.equal(g.meshes.length,1);assert.equal(g.accessors[primitive.indices].count/3,908);assert.equal(g.images.length,3);assert.equal(g.animations?.length??0,0);assert.equal(g.skins?.length??0,0);
 const m=g.materials[0];assert.ok(m.normalTexture&&m.occlusionTexture&&m.pbrMetallicRoughness.metallicRoughnessTexture&&m.pbrMetallicRoughness.baseColorTexture);assert.equal(m.emissiveFactor?.some((v:number)=>v>0)??false,false);
 for(const image of g.images){const v=g.bufferViews[image.bufferView],png=binary.subarray(v.byteOffset,v.byteOffset+v.byteLength);assert.equal(png.readUInt32BE(16),512);assert.equal(png.readUInt32BE(20),512);}
 assert.equal(ROCK_HULL_VERTICES.length/3,25);assert.equal(ROCK_HULL_INDICES.length/3,46);const a=g.accessors[primitive.attributes.POSITION],v=g.bufferViews[a.bufferView],start=(v.byteOffset??0)+(a.byteOffset??0),points=Array.from({length:a.count},(_,i)=>new THREE.Vector3(...[0,1,2].map(c=>binary.readFloatLE(start+i*(v.byteStride??12)+c*4)) as [number,number,number]));
 for(let i=0;i<ROCK_HULL_VERTICES.length;i+=3){const p=new THREE.Vector3().fromArray(ROCK_HULL_VERTICES,i);assert.ok(points.some(q=>q.distanceTo(p)<2e-6));}
});

test('actual rotated/scaled Rapier rock hull matches rendered fallback ray hits',async()=>{
 const {default:RAPIER}=await import('@dimforge/rapier3d-compat'),{createRockCollider}=await import('../src/rock-collider'),{ROCK_HULL_VERTICES,ROCK_HULL_INDICES}=await import('../src/rock-hull');await RAPIER.init();const world=new RAPIER.World({x:0,y:0,z:0});
 try{const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(.6,1.4,.23)),rock={x:422,y:2,z:-15,scale:[.9,.72,.9] as [number,number,number],rotation:q};createRockCollider(world,rock);world.step();const geo=new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(ROCK_HULL_VERTICES,3)).setIndex(ROCK_HULL_INDICES),mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.position.set(rock.x,rock.y,rock.z);mesh.quaternion.copy(q);mesh.scale.fromArray(rock.scale);mesh.updateMatrixWorld(true);
 for(const axis of [new THREE.Vector3(1,0,0),new THREE.Vector3(0,1,0),new THREE.Vector3(0,0,1),new THREE.Vector3(1,1,1).normalize()]){const start=mesh.position.clone().addScaledVector(axis,3),direction=axis.clone().negate(),visual=new THREE.Raycaster(start,direction).intersectObject(mesh)[0],physical=world.castRay(new RAPIER.Ray(start,direction),6,true);assert.ok(visual&&physical);assert.ok(Math.abs(visual.distance-physical.timeOfImpact)<.002);}
 geo.dispose();(mesh.material as THREE.Material).dispose();}finally{world.free();}
});

test('tilted rocks are seated into actual terrain and contact shading remains capped/cleared',async()=>{
 const {orientRock,seatRock}=await import('../src/rock-placement'),{ROCK_HULL_VERTICES}=await import('../src/rock-hull'),{terrainSampler}=await import('../src/vehicle-stance'),{terrainMesh}=await import('../src/excursion');const ground=terrainSampler(terrainMesh().vertices);
 for(const [x,z,a]of [[18,-3,.8],[-30,-12,2.3],[35,23,-1]]){const t=new THREE.Object3D();t.position.set(x,100,z);t.scale.set(.8,.64,.8);orientRock(t,ground,.8,a);seatRock(t,ground,.8);let minimum=Infinity,buried=0;for(let i=0;i<ROCK_HULL_VERTICES.length;i+=3){const p=new THREE.Vector3().fromArray(ROCK_HULL_VERTICES,i).applyMatrix4(t.matrix);minimum=Math.min(minimum,p.y-ground(p.x,p.z));if(p.y<=ground(p.x,p.z))buried++;}assert.ok(minimum<-.12&&buried>=5,'a broad lower band is embedded, not a balancing tip');}
 const material=new THREE.MeshStandardMaterial(),fallback=new THREE.InstancedMesh(new THREE.BoxGeometry(),material,10),instances=Array.from({length:10},(_,i)=>({matrix:new THREE.Matrix4().makeTranslation(i,0,0),color:new THREE.Color()})),scenery=new RockScenery(fallback,instances,async()=>({geometry:fallback.geometry,material}));scenery.update(new THREE.Vector3(),false,true);assert.equal(scenery.contacts().length,4);scenery.update(new THREE.Vector3(100,0,0),false,true);assert.equal(scenery.contacts().length,0);scenery.update(new THREE.Vector3(),true,false);assert.equal(scenery.contacts().length,0);
});

test('every real scenery rock lies broad-side down with bounded tilt and multiple buried support points',async()=>{
 const {orientRock,seatRock,ROCK_TILT_LIMIT}=await import('../src/rock-placement'),{surfaceRocks,terrainMesh}=await import('../src/excursion'),{terrainSampler}=await import('../src/vehicle-stance'),{ROCK_HULL_VERTICES}=await import('../src/rock-hull');const ground=terrainSampler(terrainMesh().vertices);
 for(const [i,r]of surfaceRocks().entries()){
  const t=new THREE.Object3D();t.position.set(r.x,0,r.z);t.scale.set(r.radius,r.radius*.8,r.radius);orientRock(t,ground,r.radius,i*.9);const contact=seatRock(t,ground,r.radius),up=new THREE.Vector3(0,1,0).applyQuaternion(t.quaternion);assert.ok(up.angleTo(new THREE.Vector3(0,1,0))<=ROCK_TILT_LIMIT+1e-8);
  let buried=0;const supports:THREE.Vector3[]=[];const box=new THREE.Box3();for(let j=0;j<ROCK_HULL_VERTICES.length;j+=3){const p=new THREE.Vector3().fromArray(ROCK_HULL_VERTICES,j).applyMatrix4(t.matrix);box.expandByPoint(p);if(p.y<=ground(p.x,p.z)){buried++;supports.push(p);}}
  assert.ok(buried>=5);const size=box.getSize(new THREE.Vector3());assert.ok(Math.max(size.x,size.z)>size.y*1.15);assert.ok(contact.distanceTo(t.position)<r.radius*2);
  // Three separated buried source points must surround the projected rock center.
  const cross=(a:THREE.Vector3,b:THREE.Vector3,p:THREE.Vector3)=>(b.x-a.x)*(p.z-a.z)-(b.z-a.z)*(p.x-a.x);let stable=false;
  for(let a=0;a<supports.length;a++)for(let b=a+1;b<supports.length;b++)for(let c=b+1;c<supports.length;c++){
   const u=supports[a],v=supports[b],w=supports[c],signs=[cross(u,v,t.position),cross(v,w,t.position),cross(w,u,t.position)];
   if(Math.abs(cross(u,v,w))>r.radius*r.radius*.03&&(signs.every(x=>x>=-1e-8)||signs.every(x=>x<=1e-8)))stable=true;
  }
  assert.ok(stable,'center lies above a broad buried support triangle');
 }
});
