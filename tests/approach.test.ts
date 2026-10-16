import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {startFlight,stepFlight,brakePrediction,approachGuidance,flightSpeed,NYSA_APPROACH,EREBUS_APPROACH,type FlightState} from '../src/flight';
import {createFlightScene} from '../src/flight-scene';
const controls={throttle:0,brake:true,boost:false,yaw:0,pitch:0};
const fixture=():FlightState=>({...startFlight('nysa'),phase:'flying',position:{x:400,y:100,z:-450},throttle:1,velocity:{x:0,y:0,z:-180}});

test('braking overrides held thrust/boost and stops without mutating the starting flight',()=>{
  const origin=fixture();let brake=origin,held=fixture();const source=JSON.stringify(origin);
  for(let i=0;i<120;i++){brake=stepFlight(brake,controls,1/60);held=stepFlight(held,{...controls,throttle:1,boost:true},1/60);assert.deepEqual(held,brake);}
  assert.ok(flightSpeed(brake)<.1);assert.equal(brake.throttle,0);assert.equal(JSON.stringify(origin),source);
});
test('bounded brake forecast matches actual fixed-step stopping travel including lateral/vertical drift',()=>{
  for(const [yaw,pitch,throttle] of [[0,0,1],[1.2,.6,.7],[-2,-.4,0]]){
    const f={...fixture(),throttle,velocity:{x:90,y:12,z:-80}},saved=JSON.stringify(f),prediction=brakePrediction(f,yaw,pitch);let actual=f;
    for(let i=0;i<prediction.steps;i++)actual=stepFlight(actual,{...controls,yaw,pitch},1/60);
    assert.ok(prediction.steps>0&&prediction.steps<=300);assert.ok(prediction.time<=5);assert.ok(flightSpeed(actual)<=.5);assert.equal(actual.collisions,0);
    for(const axis of ['x','y','z'] as const)assert.ok(Math.abs(actual.position[axis]-f.position[axis]-prediction.displacement[axis])<1e-9);
    assert.equal(JSON.stringify(f),saved);
  }
  const stopped={...fixture(),throttle:0,velocity:{x:0,y:0,z:0}};assert.equal(brakePrediction(stopped,0,0).distance,0);assert.equal(brakePrediction(stopped,0,0).steps,0);
});
test('closing/drift advice warns before arrival, handles receding/sideways travel and respects readiness',()=>{
  const f={...fixture(),position:{x:0,y:0,z:NYSA_APPROACH.z+150},velocity:{x:0,y:0,z:-110}};
  const cue=approachGuidance(f,0,0);assert.equal(cue.brakeNow,true);assert.equal(cue.ready,false);assert.equal(cue.closing,110);assert.equal(cue.lateral,0);
  assert.equal(approachGuidance({...f,position:{...f.position,z:f.position.z+500}},0,0).brakeNow,false);
  const away=approachGuidance({...f,velocity:{x:0,y:0,z:110}},Math.PI,0);assert.equal(away.movingAway,true);assert.equal(away.brakeNow,false);
  const sideways=approachGuidance({...f,velocity:{x:110,y:0,z:0}},-Math.PI/2,0);assert.equal(sideways.closing,0);assert.equal(sideways.lateral,110);assert.equal(sideways.brakeNow,false);
  assert.equal(approachGuidance({...f,position:{...NYSA_APPROACH},throttle:0,velocity:{x:0,y:0,z:0}},0,0).ready,true);
  const returning={...f,leg:'erebus' as const,position:{x:0,y:0,z:EREBUS_APPROACH.z-150},velocity:{x:0,y:0,z:110}};assert.equal(approachGuidance(returning,Math.PI,0).brakeNow,true);
});
test('hull recovery leaves clearance and does not repeatedly register a stationary contact',()=>{
  for(const position of [{x:30,y:12,z:-1038},{x:0,y:9,z:10}]){
    const collided=stepFlight({...fixture(),position,throttle:0,velocity:{x:0,y:0,z:0}},controls,1/60);assert.equal(collided.collisions,1);
    let f=collided;for(let i=0;i<120;i++)f=stepFlight(f,controls,1/60);assert.equal(f.collisions,1);assert.deepEqual(f.position,collided.position);assert.equal(flightSpeed(f),0);
  }
});
test('approach beacons share geometry, face both legs and change color without recoloring station lights',()=>{
  const camera=new THREE.PerspectiveCamera(),world=createFlightScene(camera);
  assert.equal(world.gates.length,3);assert.ok(world.gates.every(g=>g.geometry===world.gates[0].geometry));
  const unrelated=world.scene.children.flatMap(node=>node.children).find(c=>c instanceof THREE.Mesh&&(c.material as THREE.MeshBasicMaterial).color?.getHex()===0x77e6ee) as THREE.Mesh;
  assert.ok(unrelated);const stationMaterial=unrelated.material as THREE.MeshBasicMaterial;
  for(const leg of ['nysa','erebus'] as const){
    const f={...fixture(),leg};world.update(f,1/60,true);const goal=leg==='nysa'?NYSA_APPROACH:EREBUS_APPROACH;
    world.gates.forEach((g,i)=>assert.equal(g.position.z,goal.z+(leg==='nysa'?1:-1)*i*50));
    assert.equal((world.gates[0].material as THREE.MeshBasicMaterial).color.getHex(),0xffbb72);assert.equal(stationMaterial.color.getHex(),0x77e6ee);
    world.update({...f,position:{...goal},velocity:{x:0,y:0,z:0}},0);assert.equal((world.gates[0].material as THREE.MeshBasicMaterial).color.getHex(),0x83f0c1);
  }
  world.hide();assert.equal(world.cockpit.visible,false);
});
