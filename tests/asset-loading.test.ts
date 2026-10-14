import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createAuthoredAssetLoader} from '../src/authored-assets';
function fixtures(){const actor=new THREE.Group(),fallback=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());actor.add(fallback);return {actor,fallback};}
test('concurrent loads share one download and attach one clone per actor',async()=>{
  let downloads=0,finish!:(source:THREE.Object3D)=>void;
  const load=createAuthoredAssetLoader(()=>{downloads++;return new Promise(resolve=>finish=resolve);});
  const a=fixtures(),b=fixtures(),source=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());source.add(mesh);
  a.actor.visible=false;
  const first=load('craft',[a.actor,b.actor]),second=load('craft',[a.actor]);await Promise.resolve();assert.equal(downloads,1);assert.equal(a.fallback.visible,true);
  finish(source);await Promise.all([first,second]);await load('craft',[a.actor,b.actor]);assert.equal(downloads,1);assert.equal(a.actor.visible,false);
  for(const {actor,fallback} of [a,b]){assert.equal(fallback.visible,false);assert.equal(actor.children.length,2);const clone=actor.children[1].children[0] as THREE.Mesh;assert.notEqual(clone,mesh);assert.equal(clone.geometry,mesh.geometry);assert.equal(clone.material,mesh.material);assert.equal(actor.userData.authored,true);}
});
test('transient download failures preserve fallbacks and retry on a later request',async()=>{
  let downloads=0;const load=createAuthoredAssetLoader(async()=>{if(++downloads===1)throw Error('transient');return new THREE.Group();});
  const {actor,fallback}=fixtures();await assert.rejects(load('craft',[actor]),/transient/);assert.equal(fallback.visible,true);assert.equal(actor.children.length,1);assert.equal(actor.userData.authored,undefined);
  await load('craft',[actor]);assert.equal(downloads,2);assert.equal(fallback.visible,false);assert.equal(actor.children.length,2);
});
test('station failures do not evict a successful craft or cause duplicate attachments',async()=>{
  const requests:string[]=[];let broken=true;const load=createAuthoredAssetLoader(async kind=>{requests.push(kind);if(kind==='station'&&broken)throw Error('station failed');return new THREE.Group();});
  const craft=fixtures(),station=fixtures();await load('craft',[craft.actor]);await assert.rejects(load('station',[station.actor]),/station failed/);broken=false;
  await Promise.all([load('craft',[craft.actor]),load('station',[station.actor])]);assert.deepEqual(requests,['craft','station','station']);assert.equal(craft.actor.children.length,2);assert.equal(station.actor.children.length,2);
});
