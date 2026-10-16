import {test} from 'node:test';import assert from 'node:assert/strict';
import {pondGeometry} from '../src/pond-geometry';import {Pond} from '../src/pond';
import {terrainMesh} from '../src/excursion';import {terrainSampler} from '../src/vehicle-stance';import {WATER_LEVEL} from '../src/biomes';

function bowls(){
 const vertices=new Float32Array(5*3*3),indices:number[]=[];
 for(let z=0;z<3;z++)for(let x=0;x<5;x++)vertices.set([x,z===1&&(x===1||x===3)?-1:1,z],(z*5+x)*3);
 for(let z=0;z<2;z++)for(let x=0;x<4;x++){const a=z*5+x,b=a+1,c=a+5,d=c+1;indices.push(a,c,b,b,c,d);}
 return {vertices,indices:new Uint32Array(indices)};
}
test('water clips at shoreline, floods only the seed basin and leaves disconnected depressions dry',()=>{
 const terrain=bowls(),p=pondGeometry(terrain,0,{x:1,z:1});assert.equal(p.connectedVertices,1);assert.equal(p.depths.length/3,6);let area=0;
 for(let i=0;i<p.depths.length;i+=3){const [a,b,c]=[0,1,2].map(j=>Array.from(p.positions.slice((i+j)*3,(i+j+1)*3)));assert.ok([a,b,c].every(v=>v[1]===0&&v[0]<=1.5));const cross=(b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]);assert.ok(cross<0,'all triangles face upward');area-=cross/2;}
 assert.equal(area,.75);assert.ok(Array.from(p.depths).every(d=>d>=0&&d<=1));
 assert.equal(pondGeometry(terrain,-2,{x:1,z:1}).depths.length,0);assert.equal(pondGeometry(terrain,0,{x:50,z:50}).depths.length,0);
});
test('actual Nysa pond stays over submerged render triangles with a natural closed waterline',()=>{
 const terrain=terrainMesh(),original=terrain.vertices.slice(),ground=terrainSampler(terrain.vertices),p=pondGeometry(terrain,WATER_LEVEL),edges=new Map<string,{count:number;depth:number[]}>();
 assert.deepEqual(terrain.vertices,original);assert.ok(p.depths.length/3<1500);assert.ok(p.depths.length/3>48);assert.ok(p.connectedVertices>0);
 for(let i=0;i<p.depths.length;i+=3){
  const points=[0,1,2].map(j=>({x:p.positions[(i+j)*3],y:p.positions[(i+j)*3+1],z:p.positions[(i+j)*3+2],depth:p.depths[i+j]}));
  for(const q of points){assert.ok(Math.abs(q.y-WATER_LEVEL)<1e-6);assert.ok(q.depth>=0);assert.ok(Math.abs(WATER_LEVEL-ground(q.x,q.z)-q.depth)<2e-5);}
  const cx=points.reduce((s,q)=>s+q.x,0)/3,cz=points.reduce((s,q)=>s+q.z,0)/3,depth=points.reduce((s,q)=>s+q.depth,0)/3;
  assert.ok(Math.abs(WATER_LEVEL-ground(cx,cz)-depth)<2e-5);assert.ok(ground(cx,cz)<=WATER_LEVEL+1e-6);
  for(let j=0;j<3;j++){const a=points[j],b=points[(j+1)%3],key=[`${a.x},${a.z}`,`${b.x},${b.z}`].sort().join('|'),entry=edges.get(key);if(entry)entry.count++;else edges.set(key,{count:1,depth:[a.depth,b.depth]});}
 }
 const boundary=[...edges.values()].filter(e=>e.count===1);assert.ok(boundary.length>20);assert.ok([...edges.values()].every(e=>e.count===1||e.count===2));assert.ok(boundary.every(e=>e.depth.every(d=>d<1e-6)),'no arbitrary deep-water cutoff edge');
});
test('pond quality reuses geometry/material; ripple clock freezes for hidden/paused views',()=>{
 const pond=new Pond(terrainMesh()),mesh=pond.mesh,geometry=mesh.geometry,material=mesh.material,version=material.version,before=pond.snapshot();
 pond.setQuality(false);assert.equal(pond.snapshot().high,false);pond.setQuality(true);assert.equal(pond.snapshot().high,true);assert.equal(material.version,version);assert.equal(mesh.geometry,geometry);assert.equal(mesh.material,material);
 assert.equal(material.depthWrite,false);assert.equal(material.transparent,true);assert.equal(material.emissive.getHex(),0);assert.equal(material.map,null);assert.equal(mesh.castShadow,false);
 const normals=geometry.getAttribute('normal');for(let i=0;i<normals.count;i++)assert.ok(normals.getY(i)>.999);
 pond.update(.04,true);assert.equal(pond.snapshot().time,.04);pond.update(3,false);pond.update(NaN,true);pond.update(-1,true);assert.equal(pond.snapshot().time,.04);assert.equal(pond.snapshot().bytes,before.bytes);
 geometry.dispose();material.dispose();
});
