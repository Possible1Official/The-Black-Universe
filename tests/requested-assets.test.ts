import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {decodeGameResource} from '../src/game-resource';

function imageDimensions(bytes:Buffer,mime:string):[number,number]{
 if(mime==='image/png')return [bytes.readUInt32BE(16),bytes.readUInt32BE(20)];
 if(mime==='image/jpeg'){let p=2;while(p+8<bytes.length){while(bytes[p]===255)p++;const marker=bytes[p++];if(marker===0xd9||marker===0xda)break;const length=bytes.readUInt16BE(p);if(marker>=0xc0&&marker<=0xcf&&![0xc4,0xc8,0xcc].includes(marker))return [bytes.readUInt16BE(p+5),bytes.readUInt16BE(p+3)];p+=length;}}
 throw Error('Unsupported embedded image format');
}
test('packaged requested models match provenance, bounded geometry and embedded resources',async()=>{
 const manifest=JSON.parse(readFileSync(new URL('../public/assets/requested/provenance.json',import.meta.url),'utf8'));
 assert.deepEqual(Object.keys(manifest.assets).sort(),['bedroom','bike','biker','cockpit','corridor','interior','resident','rover','ship']);
 for(const [kind,entry] of Object.entries(manifest.assets) as [string,any][]){
  const packed=readFileSync(new URL(`../src/assets/requested/${kind}.ebup`,import.meta.url));assert.equal(createHash('sha256').update(packed).digest('hex'),entry.resource_sha256);assert.equal(packed.length,entry.resource_bytes);
  const bytes=Buffer.from(await decodeGameResource(Uint8Array.from(packed).buffer));assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(8),bytes.length);assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.glb_sha256);
  const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());assert.ok(gltf.buffers.every((b:any)=>!b.uri));assert.ok((gltf.images??[]).every((i:any)=>!i.uri));
  const binary=bytes.subarray(28+bytes.readUInt32LE(12));for(const image of gltf.images??[]){const view=gltf.bufferViews[image.bufferView],data=binary.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength);const [w,h]=imageDimensions(data,image.mimeType);assert.ok(w<=1024&&h<=1024,`${kind} oversized ${w}x${h}`);}

  const tris=gltf.meshes.flatMap((m:any)=>m.primitives).reduce((n:number,p:any)=>n+(p.indices?gltf.accessors[p.indices].count:gltf.accessors[p.attributes.POSITION].count)/3,0);assert.equal(tris,entry.triangles);assert.ok(tris<=entry.triangle_budget);assert.ok(packed.length<=entry.transfer_budget);
  if(kind==='biker'){for(const m of gltf.materials){assert.ok(!m.emissiveFactor||m.emissiveFactor.every((x:number)=>x===0),'body must not emit light');if(m.name.startsWith('HairCutout_')){assert.equal(m.alphaMode,'MASK');assert.equal(m.doubleSided,true);assert.ok(m.pbrMetallicRoughness.baseColorTexture);}}assert.equal(gltf.skins[0].joints.length,67);assert.deepEqual(gltf.animations.map((a:any)=>a.name).sort(),['Idle','Riding','Running','Sitting','Walking']);}
 }
});

test('actual corrected idle places both wrists below shoulders beside the hips',async()=>{
 const packed=readFileSync(new URL('../src/assets/requested/biker.ebup',import.meta.url));const bytes=Buffer.from(await decodeGameResource(Uint8Array.from(packed).buffer)),length=bytes.readUInt32LE(12),g=JSON.parse(bytes.subarray(20,20+length).toString()),bin=bytes.subarray(28+length);
 const objects=g.nodes.map((n:any)=>{const o=new THREE.Object3D();o.name=n.name??'';if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);return o;});g.nodes.forEach((n:any,i:number)=>{for(const child of n.children??[])objects[i].add(objects[child]);});const root=new THREE.Group();g.scenes[g.scene??0].nodes.forEach((i:number)=>root.add(objects[i]));
 const clip=g.animations.find((a:any)=>a.name==='Idle');for(const channel of clip.channels){if(channel.target.path!=='rotation')continue;const a=g.accessors[clip.samplers[channel.sampler].output],v=g.bufferViews[a.bufferView],start=(v.byteOffset??0)+(a.byteOffset??0);objects[channel.target.node].quaternion.fromArray(Array.from({length:4},(_,i)=>bin.readFloatLE(start+i*4)));}root.updateMatrixWorld(true);const position=(name:string)=>root.getObjectByName(name)!.getWorldPosition(new THREE.Vector3());const hips=position('mixamorig:Hips');
 for(const side of ['Left','Right']){const hand=position('mixamorig:'+side+'Hand'),shoulder=position('mixamorig:'+side+'Arm');assert.ok(hand.y<shoulder.y-.25);assert.ok(Math.abs(hand.z-hips.z)<.22,`hand behind torso ${hand.z-hips.z}`);}
});
