import * as THREE from 'three';
// One startup pass over owned, unmodified cuboids directly attached to the ship scene.
// Dynamic objects and mutable screens must be excluded by the caller.
export function batchStaticBoxes(root:THREE.Object3D,excluded:ReadonlySet<THREE.Object3D>,cellSize=8){
  const bins=new Map<THREE.Material,Map<string,THREE.Mesh<THREE.BoxGeometry,THREE.Material>[]>>();
  for(const object of [...root.children]){
    if(!(object instanceof THREE.Mesh)||!(object.geometry instanceof THREE.BoxGeometry)||Array.isArray(object.material)||excluded.has(object)||object.children.length||!object.visible||object.material.transparent)continue;
    const p=object.geometry.parameters;
    if(p.widthSegments!==1||p.heightSegments!==1||p.depthSegments!==1)continue;
    if(object.matrixAutoUpdate)object.updateMatrix();
    const key=[Math.floor(object.position.x/cellSize),Math.floor(object.position.z/cellSize),object.castShadow,object.receiveShadow,object.layers.mask,object.renderOrder,object.frustumCulled].join('/');
    let materialBins=bins.get(object.material);if(!materialBins){materialBins=new Map();bins.set(object.material,materialBins);}
    const members=materialBins.get(key)??[];members.push(object);materialBins.set(key,members);
  }
  const unit=new THREE.BoxGeometry(1,1,1),retired=new Set<THREE.BufferGeometry>();
  let batches=0,instances=0;
  for(const [material,materialBins] of bins)for(const members of materialBins.values()){
    if(members.length<2)continue;
    const first=members[0],batch=new THREE.InstancedMesh(unit,material,members.length);
    batch.name='Static ship cuboids';batch.castShadow=first.castShadow;batch.receiveShadow=first.receiveShadow;
    batch.layers.mask=first.layers.mask;batch.renderOrder=first.renderOrder;batch.frustumCulled=first.frustumCulled;
    members.forEach((mesh,i)=>{
      const p=mesh.geometry.parameters;
      batch.setMatrixAt(i,mesh.matrix.clone().multiply(new THREE.Matrix4().makeScale(p.width,p.height,p.depth)));
      root.remove(mesh);retired.add(mesh.geometry);
    });
    batch.instanceMatrix.needsUpdate=true;batch.computeBoundingBox();batch.computeBoundingSphere();root.add(batch);
    batches++;instances+=members.length;
  }
  const remaining=new Set<THREE.BufferGeometry>();root.traverse(object=>{if(object instanceof THREE.Mesh)remaining.add(object.geometry);});
  let disposedGeometries=0;for(const geometry of retired)if(!remaining.has(geometry)){geometry.dispose();disposedGeometries++;}
  if(!batches)unit.dispose();
  return {batches,instances,disposedGeometries};
}
