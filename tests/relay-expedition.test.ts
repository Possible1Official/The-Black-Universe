import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {freshNetwork,parseNetwork,repairRelay,activateUplink,uplinkBlock,REPAIR_SITES,OUTPOST,RELAY_PAD} from '../src/relay-expedition';
import {freshProgress,parseProgress,RELAYS} from '../src/state';
import {missionDestination} from '../src/navigation';
import {crewBriefing} from '../src/crew-briefing';
import {RelayOutpost} from '../src/relay-outpost';
import {decodeGameResource} from '../src/game-resource';
import {terrainMesh,terrainHeight,SURFACE_ORIGIN,availableLandingSites,nextLandingSite,landingPad,surfaceRocks} from '../src/excursion';
import {terrainSampler} from '../src/vehicle-stance';
import {surfaceFlightPose,SURFACE_FLIGHT_SECONDS} from '../src/flight';
import {PLAYER_SHAPE} from '../src/player-shape';
import {clearSight} from '../src/visibility';

async function kit(){
 const b=Buffer.from(await decodeGameResource(Uint8Array.from(readFileSync('src/assets/requested/corridor.ebup')).buffer)),n=b.readUInt32LE(12),g=JSON.parse(b.subarray(20,20+n).toString()),binary=b.subarray(28+n);
 // Actual shipped geometry, omitting image decoding only in this Node fixture.
 g.materials=[{}];g.images=[];g.textures=[];for(const m of g.meshes)for(const p of m.primitives)p.material=0;
 const j=Buffer.from(JSON.stringify(g)),pad=Buffer.alloc((4-j.length%4)%4,32),h=Buffer.alloc(20),bh=Buffer.alloc(8);h.writeUInt32LE(0x46546c67);h.writeUInt32LE(2,4);h.writeUInt32LE(28+j.length+pad.length+binary.length,8);h.writeUInt32LE(j.length+pad.length,12);h.writeUInt32LE(0x4e4f534a,16);bh.writeUInt32LE(binary.length);bh.writeUInt32LE(0x004e4942,4);const out=Buffer.concat([h,j,pad,bh,binary]);return new GLTFLoader().parseAsync(out.buffer.slice(out.byteOffset,out.byteOffset+out.byteLength),'');
}

test('relay repairs work in either order, are idempotent and gate uplink without changing original progression',()=>{
 for(const order of [['dune','basalt'],['basalt','dune']] as const){let network=freshNetwork();assert.equal(activateUplink(network,true),network);assert.match(uplinkBlock(network,true)!,/Dune relay.*Basalt relay/);
 for(const id of order){assert.equal(repairRelay(network,id,false),network);network=repairRelay(network,id,true);assert.equal(repairRelay(network,id,true),network);if(network.repairs.length===1)assert.equal(activateUplink(network,true),network);}
 network=activateUplink(network,true);assert.equal(network.online,true);assert.equal(activateUplink(network,true),network);
 const before={...freshProgress(),relays:RELAYS,forged:true,surveyed:true},p={...before,network};assert.deepEqual(parseProgress(JSON.stringify(p)),p);assert.deepEqual({...p,network:freshNetwork()},before);
 }
});
test('old and hostile saves default safely, deduplicate repairs and cannot forge an unlocked pad',()=>{
 const old={version:2,relays:RELAYS,forged:true,surveyed:true,fieldScans:['arch']};assert.deepEqual(parseProgress(JSON.stringify(old)).network,freshNetwork());
 for(const value of [null,42,'dune',[],{repairs:'dune',online:true},{repairs:['dune'],online:true},{repairs:['invalid'],online:true}])assert.equal(parseNetwork(value,true).online,false);
 assert.deepEqual(parseNetwork({repairs:['basalt',null,'dune','basalt',3],online:true},true),{repairs:['basalt','dune'],online:true});assert.deepEqual(parseNetwork({repairs:['basalt','dune'],online:true},false),freshNetwork());
 const partial=parseProgress(JSON.stringify({...old,network:{repairs:['dune'],online:false}}));assert.equal(partial.surveyed,true);assert.deepEqual(partial.fieldScans,['arch']);assert.deepEqual(partial.network.repairs,['dune']);assert.deepEqual(freshProgress().network,freshNetwork());
});
test('expedition tracking advances only on the surface; unlocked pad cycles and crew debrief reflect saved work',()=>{
 let p={...freshProgress(),relays:RELAYS,forged:true};assert.equal(missionDestination(p,true,'network').id,'network-dune');assert.equal(missionDestination(p,false,'network').id,'science');
 p={...p,network:repairRelay(p.network,'dune',true)};assert.equal(missionDestination(p,true,'network').id,'network-basalt');assert.match(crewBriefing('VEGA',p,'survey'),/1\/2 receivers restored.*Basalt relay/);
 p={...p,network:repairRelay(p.network,'basalt',true)};const goal=missionDestination(p,true,'network');assert.equal(goal.id,'network-uplink');assert.equal(goal.x,SURFACE_ORIGIN+OUTPOST.x);assert.equal(missionDestination(p,true).id,'sample');
 assert.deepEqual(availableLandingSites(false),['survey','arch']);assert.equal(nextLandingSite('arch',false),'survey');assert.equal(nextLandingSite('relay',false),'survey');p={...p,network:activateUplink(p.network,true)};assert.equal(nextLandingSite('arch',true),'relay');assert.equal(nextLandingSite('relay',true),'survey');assert.match(crewBriefing('VEGA',p,'survey'),/network online.*Relay pad/);
});
test('new pad and outpost are terrain-fitted, rock-free and guided flight retains selected-pad geometry',()=>{
 const ground=terrainSampler(terrainMesh().vertices);for(const x of [OUTPOST.x-4,OUTPOST.x,OUTPOST.x+4])for(const z of [OUTPOST.z-4,OUTPOST.z,OUTPOST.z+4])assert.ok(Math.abs(ground(x,z))<1e-8);
 assert.deepEqual(landingPad('relay'),RELAY_PAD);for(const rock of surfaceRocks()){assert.ok(Math.hypot(rock.x-RELAY_PAD.x,rock.z-RELAY_PAD.z)>=6);assert.ok(REPAIR_SITES.every(s=>Math.hypot(rock.x-s.x,rock.z-s.z)>=6));assert.ok(Math.abs(rock.x-OUTPOST.x)>=8||Math.abs(rock.z-OUTPOST.z)>=10);}
 for(const t of [0,1,3,SURFACE_FLIGHT_SECONDS])for(const ascending of [true,false]){const a=surfaceFlightPose(t,ascending,'survey'),b=surfaceFlightPose(t,ascending,'relay');assert.equal(b.altitude,a.altitude);assert.ok(Math.abs(b.position.x-a.position.x-76)<1e-8);assert.ok(Math.abs(b.position.z-a.position.z+75)<1e-8);assert.ok(Math.abs(b.yaw-a.yaw)<1e-10);}
 assert.equal(terrainHeight(RELAY_PAD.x,RELAY_PAD.z),0);
});
test('actual textured-kit geometry has a clear outpost entrance, continuous deck, solid back/walls and reachable console',async()=>{
 await RAPIER.init();const world=new RAPIER.World({x:0,y:-9.81,z:0});try{
 const terrain=terrainMesh(),ground=terrainSampler(terrain.vertices),outpost=new RelayOutpost(ground);outpost.init(world);await outpost.load(false,kit);assert.equal(outpost.snapshot().loaded,true);world.createCollider(RAPIER.ColliderDesc.trimesh(terrain.vertices,terrain.indices));
 world.step();for(const dx of [-1.8,0,1.8])for(const dz of [-3.4,0,3.4]){const hit=world.castRay(new RAPIER.Ray({x:OUTPOST.x+dx,y:.3,z:OUTPOST.z+dz},{x:0,y:-1,z:0}),1,true);assert.ok(hit&&.3-hit.timeOfImpact>=.039,'authored floor clears terrain to avoid coplanar flicker');}
 const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased()),capsule=world.createCollider(RAPIER.ColliderDesc.capsule(PLAYER_SHAPE.halfHeight,PLAYER_SHAPE.radius),body),controller=world.createCharacterController(PLAYER_SHAPE.offset);controller.enableAutostep(PLAYER_SHAPE.stepHeight,PLAYER_SHAPE.stepWidth,true);controller.enableSnapToGround(.2);
 const place=(x:number,z:number)=>{body.setTranslation({x,y:ground(x,z)+.87,z},true);body.setNextKinematicTranslation(body.translation());world.step();};
 const move=(dx:number,dz:number,frames:number)=>{for(let i=0;i<frames;i++){controller.computeColliderMovement(capsule,{x:dx,y:-.02,z:dz});const p=body.translation(),m=controller.computedMovement();body.setNextKinematicTranslation({x:p.x+m.x,y:p.y+m.y,z:p.z+m.z});world.step();assert.ok(body.translation().y>ground(body.translation().x,body.translation().z)+.75,'no floor hole');}return body.translation();};
 for(const x of [-1.8,0,1.8]){place(OUTPOST.x+x,OUTPOST.z+5.5);const end=move(0,-.035,190);assert.ok(end.z<OUTPOST.z-.9,JSON.stringify(end));assert.ok(end.y<1.1,'no invisible deck step');}
 place(OUTPOST.x,OUTPOST.z+.5);let p=move(0,-.035,40);const uplink=outpost.terminals.find(t=>t.id==='uplink')!;assert.ok(Math.hypot(p.x-uplink.position.x,p.y+.74-uplink.position.y,p.z-uplink.position.z)<2.65);assert.equal(clearSight(world,{x:p.x,y:p.y+.74,z:p.z},uplink.position,capsule,uplink.collider),true);
 assert.equal(clearSight(world,{x:OUTPOST.x,y:1.65,z:OUTPOST.z-5},uplink.position,undefined,uplink.collider),false,'uplink cannot be operated through the back wall');
 for(const site of REPAIR_SITES){place(site.x,site.z+4);p=move(0,-.035,55);const terminal=outpost.terminals.find(t=>t.id===site.id)!;assert.ok(Math.hypot(p.x-terminal.position.x,p.y+.74-terminal.position.y,p.z-terminal.position.z)<2.65);assert.equal(clearSight(world,{x:p.x,y:p.y+.74,z:p.z},terminal.position,capsule,terminal.collider),true);}
 for(const sign of [-1,1]){place(OUTPOST.x,OUTPOST.z);p=move(sign*.04,0,200);assert.ok(Math.abs(p.x-OUTPOST.x)<4.7,'side walls must block');}place(OUTPOST.x+1.8,OUTPOST.z);p=move(0,-.04,200);assert.ok(p.z>OUTPOST.z-4.2,'back wall must block');
 }finally{world.free();}
});
test('outpost retries failed assets without duplicate rooms; online antenna freezes while paused or hidden',async()=>{
 const outpost=new RelayOutpost(()=>0);let calls=0;const asset=await kit(),loader=async()=>{calls++;if(calls===1)throw Error('offline');return asset;};await outpost.load(false,loader);assert.equal(outpost.snapshot().loaded,false);await outpost.load(false,loader);assert.equal(calls,1);await outpost.load(true,loader);assert.equal(outpost.snapshot().loaded,true);const count=outpost.root.children.length;await outpost.load(true,loader);assert.equal(calls,2);assert.equal(outpost.root.children.length,count);
 outpost.update(1,true);assert.equal(outpost.snapshot().antenna,0);outpost.setState({repairs:['dune','basalt'],online:true});outpost.update(.1,true);const angle=outpost.snapshot().antenna;assert.ok(angle>0);for(const dt of [.1,NaN,-1,Infinity])outpost.update(dt,false);outpost.update(NaN,true);assert.equal(outpost.snapshot().antenna,angle);outpost.setState(freshNetwork());outpost.update(.1,true);assert.equal(outpost.snapshot().online,false);assert.equal(outpost.snapshot().antenna,angle);
});
