import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {decodeGameResource} from '../src/game-resource';
import {PLAYER_SHAPE} from '../src/player-shape';
import {meshColliders} from '../src/mesh-colliders';

// Decode actual exported rigid geometry without a DOM/image loader.
async function geometry(kind:string){
 const packed=readFileSync(new URL(`../src/assets/requested/${kind}.ebup`,import.meta.url));const bytes=Buffer.from(await decodeGameResource(Uint8Array.from(packed).buffer)),length=bytes.readUInt32LE(12),g=JSON.parse(bytes.subarray(20,20+length).toString()),bin=bytes.subarray(28+length);
 const accessor=(id:number)=>{const a=g.accessors[id],view=g.bufferViews[a.bufferView],size={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type as string]!,component=a.componentType===5126?4:a.componentType===5125?4:a.componentType===5123?2:1,values:number[]=[];for(let i=0;i<a.count;i++)for(let j=0;j<size;j++){const offset=(view.byteOffset??0)+(a.byteOffset??0)+i*(view.byteStride??component*size)+j*component;values.push(a.componentType===5126?bin.readFloatLE(offset):a.componentType===5125?bin.readUInt32LE(offset):a.componentType===5123?bin.readUInt16LE(offset):bin.readUInt8(offset));}return values;};
 const nodes=g.nodes.map((n:any)=>{const group=new THREE.Group();group.name=n.name??'';if(n.matrix)group.applyMatrix4(new THREE.Matrix4().fromArray(n.matrix));else{if(n.translation)group.position.fromArray(n.translation);if(n.rotation)group.quaternion.fromArray(n.rotation);if(n.scale)group.scale.fromArray(n.scale);}if(n.mesh!==undefined)for(const p of g.meshes[n.mesh].primitives){const b=new THREE.BufferGeometry();b.setAttribute('position',new THREE.Float32BufferAttribute(accessor(p.attributes.POSITION),3));if(p.indices!==undefined)b.setIndex(accessor(p.indices));group.add(new THREE.Mesh(b));}return group;});g.nodes.forEach((n:any,i:number)=>{for(const c of n.children??[])nodes[i].add(nodes[c]);});const root=new THREE.Group();for(const n of g.scenes[g.scene??0].nodes)root.add(nodes[n]);return root;
}
test('actual Intrepid floors support walking and both cleared authored side doors are traversable',async()=>{
 await RAPIER.init();const world=new RAPIER.World({x:0,y:-9.81,z:0});try{
 meshColliders(world,await geometry('interior'));world.timestep=1/60;
 for(const side of [-1,1]){const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,.9,-6.0375)),capsule=world.createCollider(RAPIER.ColliderDesc.capsule(.55,.3),body),controller=world.createCharacterController(.015);controller.enableAutostep(.25,.2,true);controller.enableSnapToGround(.2);world.step();
 for(let i=0;i<220;i++){controller.computeColliderMovement(capsule,{x:side*.025,y:-.02,z:0});const p=body.translation(),m=controller.computedMovement();body.setNextKinematicTranslation({x:p.x+m.x,y:p.y+m.y,z:p.z+m.z});world.step();}
 const p=body.translation();assert.ok(side*p.x>4.8,`door ${side} blocked actual geometry at ${JSON.stringify(p)}`);assert.ok(p.y>.75&&p.y<1.1,'authored floor supports capsule');world.removeRigidBody(body);
 }
 }finally{world.free();}
});
test('actual bedroom entry leads onto a physical floor without crossing a sealed front wall',async()=>{
 await RAPIER.init();const world=new RAPIER.World({x:0,y:-9.81,z:0});try{meshColliders(world,await geometry('bedroom'));world.createCollider(RAPIER.ColliderDesc.cuboid(2,.1,2).setTranslation(0,-.1,-5.5));world.timestep=1/60;const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,.9,-5.5)),capsule=world.createCollider(RAPIER.ColliderDesc.capsule(.55,.3),body),controller=world.createCharacterController(.015);controller.enableSnapToGround(.2);controller.enableAutostep(.25,.2,true);world.step();for(let i=0;i<240;i++){controller.computeColliderMovement(capsule,{x:0,y:-.02,z:.025});const p=body.translation(),m=controller.computedMovement();body.setNextKinematicTranslation({x:p.x+m.x,y:p.y+m.y,z:p.z+m.z});world.step();}assert.ok(body.translation().z>-.5,`sealed bedroom at ${JSON.stringify(body.translation())}`);assert.ok(body.translation().y>.7);}finally{world.free();}
});

test('repaired authored lounge is walkable across former side wall and bow view has no opaque panel',async()=>{
 await RAPIER.init();const world=new RAPIER.World({x:0,y:-9.81,z:0});try{
 meshColliders(world,await geometry('interior'));world.timestep=1/60;
 const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,.9,1.8));const c=world.createCollider(RAPIER.ColliderDesc.capsule(PLAYER_SHAPE.halfHeight,PLAYER_SHAPE.radius),body);const controller=world.createCharacterController(PLAYER_SHAPE.offset);controller.enableSnapToGround(.2);controller.enableAutostep(PLAYER_SHAPE.stepHeight,PLAYER_SHAPE.stepWidth,true);world.step();
 for(let i=0;i<120;i++){controller.computeColliderMovement(c,{x:.025,y:-.02,z:0});const p=body.translation(),m=controller.computedMovement();body.setNextKinematicTranslation({x:p.x+m.x,y:p.y+m.y,z:p.z+m.z});world.step();}
 assert.ok(body.translation().x>2.75,`old launch wall ${JSON.stringify(body.translation())}`);assert.ok(body.translation().y>.7);
 assert.equal(world.castRay(new RAPIER.Ray({x:0,y:2,z:-18},{x:0,y:0,z:-1}),3,true),null,'bow opening reveals exterior');
 }finally{world.free();}
});
test('standing player traverses a 55cm gap and remains blocked by a 40cm opening',async()=>{
 await RAPIER.init();for(const gap of [.55,.4]){const world=new RAPIER.World({x:0,y:-9.81,z:0});try{
 world.createCollider(RAPIER.ColliderDesc.cuboid(2,.1,3).setTranslation(0,-.1,0));for(const side of [-1,1])world.createCollider(RAPIER.ColliderDesc.cuboid(.5,1,.15).setTranslation(side*(gap/2+.5),1,0));const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,.9,1));const c=world.createCollider(RAPIER.ColliderDesc.capsule(PLAYER_SHAPE.halfHeight,PLAYER_SHAPE.radius),body),ctl=world.createCharacterController(PLAYER_SHAPE.offset);world.step();for(let i=0;i<100;i++){ctl.computeColliderMovement(c,{x:0,y:-.02,z:-.025});const p=body.translation(),m=ctl.computedMovement();body.setNextKinematicTranslation({x:p.x+m.x,y:p.y+m.y,z:p.z+m.z});world.step();}if(gap===.55)assert.ok(body.translation().z<-.8);else assert.ok(body.translation().z>0,JSON.stringify(body.translation()));
 }finally{world.free();}}
});
test('reported Deep Scan side gaps connect to the forward bridge around real console colliders',async()=>{
 await RAPIER.init();const world=new RAPIER.World({x:0,y:-9.81,z:0});try{
 meshColliders(world,await geometry('interior'));for(const z of [-10.5,-13.5,-17.2])world.createCollider(RAPIER.ColliderDesc.cuboid(.9,.55,.5).setTranslation(0,.55,z));world.timestep=1/60;
 for(const side of [-1,1]){const b=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(side*1.4,.9,-8.5)),c=world.createCollider(RAPIER.ColliderDesc.capsule(PLAYER_SHAPE.halfHeight,PLAYER_SHAPE.radius),b),ctl=world.createCharacterController(PLAYER_SHAPE.offset);ctl.enableSnapToGround(.2);ctl.enableAutostep(PLAYER_SHAPE.stepHeight,PLAYER_SHAPE.stepWidth,true);world.step();for(let i=0;i<320;i++){ctl.computeColliderMovement(c,{x:0,y:-.02,z:-.025});const p=b.translation(),m=ctl.computedMovement();b.setNextKinematicTranslation({x:p.x+m.x,y:p.y+m.y,z:p.z+m.z});world.step();}assert.ok(b.translation().z< -15.8,`science gap ${side}: ${JSON.stringify(b.translation())}`);assert.ok(b.translation().y>.7&&b.translation().y<1.2);world.removeRigidBody(b);}
 }finally{world.free();}
});


test('reported lounge floor has one visible surface owner rather than coplanar overlapping panels',async()=>{
 const root=await geometry('interior');root.updateMatrixWorld(true);const ray=new THREE.Raycaster();
 for(const [x,z] of [[0,2],[1,4],[2.8,3],[0,6],[0,-1]]){ray.set(new THREE.Vector3(x,2,z),new THREE.Vector3(0,-1,0));const hits=ray.intersectObject(root,true).filter(h=>Math.abs(h.point.y)<.035);assert.ok(hits.length);assert.deepEqual([...new Set(hits.map(h=>h.object.parent?.name))],['LoungeFloor']);}
});

test('repaired lounge and runway support continuous forward walking without vertical oscillation',async()=>{
 await RAPIER.init();const world=new RAPIER.World({x:0,y:-9.81,z:0});try{meshColliders(world,await geometry('interior'));world.createCollider(RAPIER.ColliderDesc.cuboid(3.7,.1,12).setTranslation(0,-.1,18.825));world.timestep=1/60;const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(1.4,.9,-1.2)),c=world.createCollider(RAPIER.ColliderDesc.capsule(PLAYER_SHAPE.halfHeight,PLAYER_SHAPE.radius),body),ctl=world.createCharacterController(PLAYER_SHAPE.offset);ctl.enableSnapToGround(.2);ctl.enableAutostep(PLAYER_SHAPE.stepHeight,PLAYER_SHAPE.stepWidth,true);world.step();const ys=[];
 for(let i=0;i<430;i++){ctl.computeColliderMovement(c,{x:0,y:-.02,z:.03});const p=body.translation(),m=ctl.computedMovement();body.setNextKinematicTranslation({x:p.x+m.x,y:p.y+m.y,z:p.z+m.z});world.step();ys.push(body.translation().y);}assert.ok(body.translation().z>10,JSON.stringify(body.translation()));assert.ok(Math.max(...ys)-Math.min(...ys)<.14);
 }finally{world.free();}
});
