import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {SurfaceContact,contactStrength} from '../src/surface-contact';
import {terrainMesh,SURFACE_ORIGIN} from '../src/excursion';
import {terrainSampler} from '../src/vehicle-stance';

test('contact follows world coordinates, heading and terrain clearance, then fades in air',()=>{
  const contact=new SurfaceContact(),ground=terrainSampler(terrainMesh().vertices),x=42,z=-38,y=ground(x,z);
  contact.update('rover',{x:SURFACE_ORIGIN+x,y:y+.04,z,yaw:Math.PI/2,visible:true},y);
  const p=contact.snapshot()[2];assert.equal(p.ellipse[0],442);assert.equal(p.ellipse[1],z);
  assert.ok(Math.abs(p.pose[0])<1e-12);assert.equal(p.pose[1],1);assert.ok(p.ellipse[3]>p.ellipse[2]);assert.ok(p.pose[2]>.4);
  contact.update('rover',{x:442,y:y+1,z,yaw:0,visible:true},y);const airborne=contact.snapshot()[2];assert.ok(airborne.ellipse[2]>p.ellipse[2]);assert.ok(airborne.pose[2]<p.pose[2]);
  contact.update('rover',{x:442,y:y+3,z,yaw:0,visible:true},y);assert.equal(contact.snapshot()[2].pose[2],0);
  for(const kind of ['player','bike','rover','shuttle'] as const){let previous=1;for(let gap=0;gap<=12;gap+=.1){const strength=contactStrength(kind,gap);assert.ok(strength>=0&&strength<=previous);previous=strength;}assert.equal(contactStrength(kind,NaN),0);}
});

test('hidden, invalid and departed contacts clear without leaking into another scene',()=>{
  const c=new SurfaceContact(),pose={x:400,y:0,z:0,yaw:0,visible:true};
  c.update('player',pose,0);assert.ok(c.snapshot()[0].pose[2]>0);
  c.update('player',{...pose,visible:false},0);assert.equal(c.snapshot()[0].pose[2],0);
  c.update('bike',pose,0);c.update('bike',{...pose,x:NaN},0);assert.equal(c.snapshot()[1].pose[2],0);
  c.update('shuttle',pose,0);c.clear();assert.ok(c.snapshot().every(c=>c.pose[2]===0));
});

test('ground and pad shaders share live contact uniforms across quality recompiles',()=>{
  const c=new SurfaceContact(),ground=new THREE.MeshStandardMaterial(),pad=new THREE.MeshStandardMaterial();
  let originalHook=0;ground.onBeforeCompile=()=>{originalHook++;};c.bind(ground);c.bind(pad);
  const shader=()=>({uniforms:{},vertexShader:'#include <project_vertex>',fragmentShader:'#include <opaque_fragment>'}) as any;
  const g=shader(),p=shader();ground.onBeforeCompile(g,null as any);pad.onBeforeCompile(p,null as any);
  assert.equal(originalHook,1);assert.equal(g.uniforms.contactEllipses,p.uniforms.contactEllipses);assert.equal(g.uniforms.contactPoses,p.uniforms.contactPoses);
  assert.ok(g.vertexShader.includes('modelMatrix * vec4(transformed'));assert.ok(g.fragmentShader.includes('outgoingLight *= contactVisibility'));
  c.update('bike',{x:407,y:0,z:27,yaw:.3,visible:true},0);assert.ok(g.uniforms.contactPoses.value[1].z>0);
  ground.normalMap=new THREE.Texture();ground.needsUpdate=true;const recompiled=shader();ground.onBeforeCompile(recompiled,null as any);assert.equal(recompiled.uniforms.contactPoses,g.uniforms.contactPoses);
  c.updateRock(3,410,20,.6,.4);assert.equal(p.uniforms.contactPoses.value[7].z,.28);c.clear();assert.ok(p.uniforms.contactPoses.value.every((v:THREE.Vector4)=>v.z===0));
});
