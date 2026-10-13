import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {batchStaticBoxes} from '../src/batching';
function box(root:THREE.Object3D,material:THREE.Material,x:number,z:number,geometry=new THREE.BoxGeometry(2,3,4)){
 const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,1,z);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;
}
function closeBounds(actual:THREE.Box3,expected:THREE.Box3){assert.ok(actual.min.distanceTo(expected.min)<1e-5);assert.ok(actual.max.distanceTo(expected.max)<1e-5);}
test('static instances preserve world bounds, rotation, scale, material and shadow flags',()=>{
 const root=new THREE.Group();root.position.set(10,2,-5);root.rotation.y=.4;
 const material=new THREE.MeshStandardMaterial();const a=box(root,material,1,1),b=box(root,material,3,2,new THREE.BoxGeometry(4,.3,6));
 a.rotation.set(.3,.4,.2);a.scale.set(.5,2,1.3);b.rotation.z=.2;root.updateMatrixWorld(true);
 const bounds=[a,b].map(m=>{m.geometry.computeBoundingBox();return m.geometry.boundingBox!.clone().applyMatrix4(m.matrixWorld);});
 const result=batchStaticBoxes(root,new Set());assert.deepEqual(result,{batches:1,instances:2,disposedGeometries:2});root.updateMatrixWorld(true);
 const batch=root.children[0] as THREE.InstancedMesh;assert.ok(batch.isInstancedMesh);assert.equal(batch.material,material);assert.equal(batch.castShadow,true);assert.equal(batch.receiveShadow,true);
 batch.geometry.computeBoundingBox();for(let i=0;i<2;i++){const matrix=new THREE.Matrix4();batch.getMatrixAt(i,matrix);closeBounds(batch.geometry.boundingBox!.clone().applyMatrix4(batch.matrixWorld.clone().multiply(matrix)),bounds[i]);}
 assert.ok(batch.boundingSphere&&Number.isFinite(batch.boundingSphere.radius));assert.ok(batch.boundingBox&&!batch.boundingBox.isEmpty());
});
test('spatial/material buckets preserve solitary boxes and exclude mutable, child and transparent objects',()=>{
 const root=new THREE.Scene(),material=new THREE.MeshStandardMaterial();
 box(root,material,1,1);box(root,material,2,1);
 const far=box(root,material,30,1),screen=box(root,material,3,1),door=box(root,material,4,1);door.add(new THREE.Object3D());
 const glass=box(root,new THREE.MeshBasicMaterial({transparent:true,opacity:.5}),5,1),segmented=box(root,material,6,1,new THREE.BoxGeometry(1,1,1,2,2,2));
 const dynamic=new THREE.Group();root.add(dynamic);const crew=box(dynamic,material,1,1);
 const other=box(root,new THREE.MeshStandardMaterial(),7,1);
 const result=batchStaticBoxes(root,new Set([screen]));assert.equal(result.instances,2);
 for(const retained of [far,screen,door,glass,segmented,other])assert.equal(retained.parent,root);assert.equal(crew.parent,dynamic);
 screen.material=new THREE.MeshBasicMaterial({color:0xff0000});assert.equal(screen.material.color.getHex(),0xff0000);
});
test('shared geometries still used by excluded meshes survive; manual matrices are retained',()=>{
 const root=new THREE.Scene(),material=new THREE.MeshStandardMaterial(),geometry=new THREE.BoxGeometry(1,1,1);
 const a=box(root,material,1,1,geometry),b=box(root,material,2,1,geometry),retained=box(root,material,3,1,geometry);
 a.matrixAutoUpdate=false;a.matrix.makeTranslation(1,4,1);let disposed=false;geometry.addEventListener('dispose',()=>disposed=true);
 const result=batchStaticBoxes(root,new Set([retained]));assert.equal(result.disposedGeometries,0);assert.equal(disposed,false);assert.equal(retained.parent,root);
 const batch=root.children.find(m=>m instanceof THREE.InstancedMesh) as THREE.InstancedMesh;const matrix=new THREE.Matrix4();batch.getMatrixAt(0,matrix);assert.equal(matrix.elements[13],4);assert.equal(batch.count,2);assert.equal(b.parent,null);
});
