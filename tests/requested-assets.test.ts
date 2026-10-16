import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {decodeGameResource} from '../src/game-resource';
import {CARTRIDGE_LAYOUT} from '../src/supply-cartridges';

function imageDimensions(bytes:Buffer,mime:string):[number,number]{
 if(mime==='image/png')return [bytes.readUInt32BE(16),bytes.readUInt32BE(20)];
 if(mime==='image/jpeg'){let p=2;while(p+8<bytes.length){while(bytes[p]===255)p++;const marker=bytes[p++];if(marker===0xd9||marker===0xda)break;const length=bytes.readUInt16BE(p);if(marker>=0xc0&&marker<=0xcf&&![0xc4,0xc8,0xcc].includes(marker))return [bytes.readUInt16BE(p+5),bytes.readUInt16BE(p+3)];p+=length;}}
 throw Error('Unsupported embedded image format');
}
test('packaged requested models match provenance, bounded geometry and embedded resources',async()=>{
 const manifest=JSON.parse(readFileSync(new URL('../public/assets/requested/provenance.json',import.meta.url),'utf8'));
 assert.deepEqual(Object.keys(manifest.assets).sort(),['bedroom','bike','biker','canister','cargo','cockpit','corridor','grass','interior','resident','rock','rover','ship']);
 for(const [kind,entry] of Object.entries(manifest.assets) as [string,any][]){
  const packed=readFileSync(new URL(`../src/assets/requested/${kind}.ebup`,import.meta.url));assert.equal(createHash('sha256').update(packed).digest('hex'),entry.resource_sha256);assert.equal(packed.length,entry.resource_bytes);
  const bytes=Buffer.from(await decodeGameResource(Uint8Array.from(packed).buffer));assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(8),bytes.length);assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.glb_sha256);
  const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());assert.ok(gltf.buffers.every((b:any)=>!b.uri));assert.ok((gltf.images??[]).every((i:any)=>!i.uri));
  const binary=bytes.subarray(28+bytes.readUInt32LE(12));for(const image of gltf.images??[]){const view=gltf.bufferViews[image.bufferView],data=binary.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength);const [w,h]=imageDimensions(data,image.mimeType);assert.ok(w<=1024&&h<=1024,`${kind} oversized ${w}x${h}`);}

  const tris=gltf.meshes.flatMap((m:any)=>m.primitives).reduce((n:number,p:any)=>n+(p.indices!==undefined?gltf.accessors[p.indices].count:gltf.accessors[p.attributes.POSITION].count)/3,0);assert.equal(tris,entry.triangles);assert.ok(tris<=entry.triangle_budget);assert.ok(packed.length<=entry.transfer_budget);
  if(kind==='biker'){for(const m of gltf.materials){assert.ok(!m.emissiveFactor||m.emissiveFactor.every((x:number)=>x===0),'body must not emit light');if(m.name.startsWith('HairCutout_')){assert.equal(m.alphaMode,'MASK');assert.equal(m.doubleSided,true);assert.ok(m.pbrMetallicRoughness.baseColorTexture);}}assert.equal(gltf.skins[0].joints.length,67);assert.deepEqual(gltf.animations.map((a:any)=>a.name).sort(),['Idle','Jump','Riding','Running','Sitting','Walking']);}
 }
});

test('actual corrected idle places both wrists below shoulders beside the hips',async()=>{
 const packed=readFileSync(new URL('../src/assets/requested/biker.ebup',import.meta.url));const bytes=Buffer.from(await decodeGameResource(Uint8Array.from(packed).buffer)),length=bytes.readUInt32LE(12),g=JSON.parse(bytes.subarray(20,20+length).toString()),bin=bytes.subarray(28+length);
 const objects=g.nodes.map((n:any)=>{const o=new THREE.Object3D();o.name=n.name??'';if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);return o;});g.nodes.forEach((n:any,i:number)=>{for(const child of n.children??[])objects[i].add(objects[child]);});const root=new THREE.Group();g.scenes[g.scene??0].nodes.forEach((i:number)=>root.add(objects[i]));
 const clip=g.animations.find((a:any)=>a.name==='Idle');for(const channel of clip.channels){if(channel.target.path!=='rotation')continue;const a=g.accessors[clip.samplers[channel.sampler].output],v=g.bufferViews[a.bufferView],start=(v.byteOffset??0)+(a.byteOffset??0);objects[channel.target.node].quaternion.fromArray(Array.from({length:4},(_,i)=>bin.readFloatLE(start+i*4)));}root.updateMatrixWorld(true);const position=(name:string)=>root.getObjectByName(name)!.getWorldPosition(new THREE.Vector3());const hips=position('mixamorig:Hips');
 for(const side of ['Left','Right']){const hand=position('mixamorig:'+side+'Hand'),shoulder=position('mixamorig:'+side+'Arm');assert.ok(hand.y<shoulder.y-.25);assert.ok(Math.abs(hand.z-hips.z)<.22,`hand behind torso ${hand.z-hips.z}`);}
});
test('new Jump motion is in-place with finite moving leg rotations on the shipped rig',async()=>{
 const packed=readFileSync(new URL('../src/assets/requested/biker.ebup',import.meta.url));const bytes=Buffer.from(await decodeGameResource(Uint8Array.from(packed).buffer)),length=bytes.readUInt32LE(12),g=JSON.parse(bytes.subarray(20,20+length).toString()),bin=bytes.subarray(28+length);const jump=g.animations.find((a:any)=>a.name==='Jump');assert.ok(jump);
 let bends=false;for(const ch of jump.channels){const a=g.accessors[jump.samplers[ch.sampler].output],v=g.bufferViews[a.bufferView],n=ch.target.path==='rotation'?4:3,size=a.count*n,offset=(v.byteOffset??0)+(a.byteOffset??0),values=Array.from({length:size},(_,i)=>bin.readFloatLE(offset+i*4));assert.ok(values.every(Number.isFinite));if(ch.target.path==='translation')for(let axis=0;axis<3;axis++){const x=values.filter((_,i)=>i%3===axis);assert.ok(Math.max(...x)-Math.min(...x)<.0001,'physics owns jumping translation');}if(g.nodes[ch.target.node].name==='mixamorig:LeftLeg'&&ch.target.path==='rotation')bends=values.some((x:number,i:number)=>Math.abs(x-values[i%4])>.1);}
 assert.ok(bends,'Jump must animate leg flexion');
});

test('rover preserves lit source albedo and tangent detail with four independent wheels',async()=>{
 const packed=readFileSync(new URL('../src/assets/requested/rover.ebup',import.meta.url));
 const entry=JSON.parse(readFileSync(new URL('../public/assets/requested/provenance.json',import.meta.url),'utf8')).assets.rover;
 assert.equal(createHash('sha256').update(packed).digest('hex'),entry.resource_sha256);assert.ok(packed.length<=entry.transfer_budget);
 const bytes=Buffer.from(await decodeGameResource(Uint8Array.from(packed).buffer));
 const g=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
 assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.glb_sha256);
 const binary=bytes.subarray(28+bytes.readUInt32LE(12));for(const image of g.images){const v=g.bufferViews[image.bufferView];const size=imageDimensions(binary.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength),image.mimeType);assert.ok(size.every(x=>x<=1024));}
 const triangles=g.meshes.flatMap((m:any)=>m.primitives).reduce((sum:number,p:any)=>sum+g.accessors[p.indices].count/3,0);assert.equal(triangles,entry.triangles);assert.ok(triangles<=entry.triangle_budget);
 for(const material of g.materials){
  assert.ok(material.pbrMetallicRoughness.baseColorTexture,'source albedo must survive export');
  assert.ok(material.normalTexture,'source surface detail must survive export');
  assert.ok(material.pbrMetallicRoughness.metallicRoughnessTexture);
  assert.ok(material.emissiveTexture);assert.ok((material.emissiveFactor??[]).every((x:number)=>x<=.7));
  assert.ok(Math.abs(material.normalTexture.scale-.65)<.001);
 }
 const wheels=g.nodes.filter((n:any)=>n.name?.startsWith('Rover_Wheel_'));
 assert.equal(wheels.length,4);assert.ok(wheels.every((w:any)=>w.children.length===2));assert.equal(g.nodes.filter((n:any)=>n.name?.startsWith('Rover_Leg_')).length,4);
 assert.equal((g.animations??[]).length,0,'source has no usable motion clips');
});

test('captured locomotion replaces motion only and preserves reviewed geometry, skin and texture bytes',async()=>{
 const p=JSON.parse(readFileSync(new URL('../public/assets/requested/motion-provenance.json',import.meta.url),'utf8')),packed=readFileSync(new URL('../src/assets/requested/biker.ebup',import.meta.url)),b=Buffer.from(await decodeGameResource(Uint8Array.from(packed).buffer)),n=b.readUInt32LE(12),g=JSON.parse(b.subarray(20,20+n).toString()),bin=b.subarray(28+n),hash=(v:any)=>createHash('sha256').update(v).digest('hex');
 assert.deepEqual(p.motions.map((x:any)=>x.name).sort(),['Jump','Running','Walking']);assert.equal(hash(bin.subarray(0,p.base_binary_bytes)),p.base_binary_sha256);
 for(const [key,value] of Object.entries(p.preserved))assert.equal(hash(JSON.stringify(g[key])),value,`${key} changed during motion merge`);
 for(const name of ['Walking','Running','Jump']){const a=g.animations.find((x:any)=>x.name===name);assert.ok(a.channels.length>=60);for(const channel of a.channels){const name=g.nodes[channel.target.node].name;assert.ok(g.skins.some((skin:any)=>skin.joints.includes(channel.target.node))||name==='cyber girl');if(name==='cyber girl'){const output=g.accessors[a.samplers[channel.sampler].output],view=g.bufferViews[output.bufferView],width=output.type==='VEC4'?4:3,start=(view.byteOffset??0)+(output.byteOffset??0);for(let i=0;i<output.count;i++)for(let j=0;j<width;j++)assert.ok(Math.abs(bin.readFloatLE(start+(i*width+j)*4)-bin.readFloatLE(start+j*4))<.00001,'armature root must stay fixed');}}}
});

test('field cargo derivative preserves mesh/PBR data with fitted bounds and bounded images',async()=>{
 const report=JSON.parse(readFileSync(new URL('../public/assets/requested/cargo-conversion.json',import.meta.url),'utf8'));
 const packed=readFileSync(new URL('../src/assets/requested/cargo.ebup',import.meta.url)),bytes=Buffer.from(await decodeGameResource(Uint8Array.from(packed).buffer)),n=bytes.readUInt32LE(12),g=JSON.parse(bytes.subarray(20,20+n).toString()),bin=bytes.subarray(28+n);
 for(const [index,hash]of Object.entries(report.preserved_mesh_views_sha256)){const v=g.bufferViews[Number(index)],data=bin.subarray(v.byteOffset,v.byteOffset+v.byteLength);assert.equal(createHash('sha256').update(data).digest('hex'),hash,'source vertices, indices, UVs, normals and tangents preserved');}
 assert.equal(g.animations?.length??0,0);assert.equal(g.skins?.length??0,0);
 assert.equal(g.meshes.length,1);assert.equal(g.meshes[0].primitives.length,1);
 const material=g.materials[0];assert.ok(material.pbrMetallicRoughness.baseColorTexture);assert.ok(material.normalTexture);assert.ok(material.pbrMetallicRoughness.metallicRoughnessTexture);assert.equal(material.occlusionTexture.index,material.pbrMetallicRoughness.metallicRoughnessTexture.index);assert.equal(material.emissiveTexture,undefined);
 const root=g.nodes[g.scenes[g.scene??0].nodes[0]],node=g.nodes[root.children[0]],a=g.accessors[g.meshes[node.mesh].primitives[0].attributes.POSITION],min=a.min.map((v:number,i:number)=>(v+(node.translation?.[i]??0))*root.scale[i]+root.translation[i]),max=a.max.map((v:number,i:number)=>(v+(node.translation?.[i]??0))*root.scale[i]+root.translation[i]);
 assert.ok(Math.abs(max[0]-min[0]-1.25)<1e-6);assert.ok(Math.abs(min[0]+max[0])<1e-6);assert.ok(Math.abs(min[2]+max[2])<1e-6);assert.ok(Math.abs(min[1]-.02)<1e-6);assert.ok(max[1]<.6&&max[2]-min[2]<=1);
 for(const image of g.images){const v=g.bufferViews[image.bufferView];assert.deepEqual(imageDimensions(bin.subarray(v.byteOffset,v.byteOffset+v.byteLength),image.mimeType),[512,512]);}
 assert.ok(report.images.find((i:any)=>i.name.includes('Normal')).normal_renormalized);
});

test('coolant canister retains reviewed mesh/PBR data and fits both display envelopes',async()=>{
 const report=JSON.parse(readFileSync(new URL('../public/assets/requested/canister-conversion.json',import.meta.url),'utf8')),packed=readFileSync(new URL('../src/assets/requested/canister.ebup',import.meta.url)),bytes=Buffer.from(await decodeGameResource(Uint8Array.from(packed).buffer)),n=bytes.readUInt32LE(12),g=JSON.parse(bytes.subarray(20,20+n).toString()),bin=bytes.subarray(28+n);
 for(const [index,hash]of Object.entries(report.preserved_mesh_views_sha256)){const v=g.bufferViews[Number(index)];assert.equal(createHash('sha256').update(bin.subarray(v.byteOffset,v.byteOffset+v.byteLength)).digest('hex'),hash);}
 const m=g.materials[0];assert.ok(m.pbrMetallicRoughness.baseColorTexture&&m.normalTexture&&m.occlusionTexture&&m.pbrMetallicRoughness.metallicRoughnessTexture);assert.equal(m.emissiveTexture,undefined);assert.equal(g.animations?.length??0,0);assert.equal(g.skins?.length??0,0);
 assert.equal(report.bounds_size[1],.7);assert.ok(report.bounds_size[0]<.263&&report.bounds_size[2]<.263);const layout=CARTRIDGE_LAYOUT,half=(layout.offset+report.bounds_size[0]/2)*layout.fieldScale;assert.ok((layout.offset+report.bounds_size[0]/2)*layout.rackScale<.42,'rack pair clears the inner faces of its frame');assert.ok(layout.fieldX-half>-.48&&layout.fieldX+half<.06,'pair fits the actual opening, not the lid-shifted whole-model center');assert.ok(layout.fieldY+(.7+.01)*layout.fieldScale<.57,'caps remain below the open crate rim');assert.ok(layout.rackY+(.7+.01)*layout.rackScale<1.48);
 for(const image of g.images){const v=g.bufferViews[image.bufferView];assert.deepEqual(imageDimensions(bin.subarray(v.byteOffset,v.byteOffset+v.byteLength),image.mimeType),[512,512]);}
});

test('hinged rover preserves every source triangle attribute/material and image, with valid aligned export buffers',async()=>{
 const packed=readFileSync(new URL('../src/assets/requested/rover.ebup',import.meta.url)),b=Buffer.from(await decodeGameResource(Uint8Array.from(packed).buffer)),n=b.readUInt32LE(12),g=JSON.parse(b.subarray(20,20+n).toString()),bin=b.subarray(28+n),report=JSON.parse(readFileSync(new URL('../public/assets/requested/rover-hinges.json',import.meta.url),'utf8')),hash=(x:Buffer|string)=>createHash('sha256').update(x).digest('hex');
 assert.equal(g.buffers[0].byteLength,bin.length);for(const v of g.bufferViews)assert.ok(Number.isInteger(v.byteOffset)&&v.byteOffset%4===0&&v.byteOffset+v.byteLength<=bin.length);
 for(const [i,image]of g.images.entries()){const v=g.bufferViews[image.bufferView];assert.equal(hash(bin.subarray(v.byteOffset,v.byteOffset+v.byteLength)),report.image_sha256[i]);}
 const signatures:string[]=[],widths:Record<string,number>={SCALAR:1,VEC2:2,VEC3:3,VEC4:4},bytes:Record<number,number>={5121:1,5123:2,5125:4,5126:4};
 for(const mesh of g.meshes)for(const p of mesh.primitives){
  const a=g.accessors[p.indices],v=g.bufferViews[a.bufferView],start=v.byteOffset+(a.byteOffset??0),ids=Array.from({length:a.count},(_,i)=>a.componentType===5123?bin.readUInt16LE(start+i*2):bin.readUInt32LE(start+i*4));
  for(let j=0;j<ids.length;j+=3){const pieces=[Buffer.from([p.material])];for(const id of ids.slice(j,j+3))for(const key of Object.keys(p.attributes).sort()){const a=g.accessors[p.attributes[key]],v=g.bufferViews[a.bufferView],size=widths[a.type]*bytes[a.componentType],offset=v.byteOffset+(a.byteOffset??0)+id*(v.byteStride??size);pieces.push(bin.subarray(offset,offset+size));}signatures.push(hash(Buffer.concat(pieces)));}
 }
 assert.equal(signatures.length,27928);assert.equal(hash(signatures.sort().join('')),report.triangle_attribute_multiset_sha256);assert.equal(report.triangle_data_preserved,true);assert.equal(g.nodes.filter((n:any)=>n.name?.startsWith('Rover_Knuckle_')).length,4);
});
