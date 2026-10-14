import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {STATION_ASSEMBLY,CRAFT_CLEARANCE} from '../src/station';
import {SHUTTLE_SIZE,SHUTTLE_HATCH_Z} from '../src/shuttle';
import RAPIER from '@dimforge/rapier3d-compat';
import {clearSight} from '../src/visibility';

test('supplied game assets are self-contained and meet geometry, transfer and texture budgets',()=>{
  for(const kind of ['craft','station']){
    const file=readFileSync(new URL(`../src/assets/${kind}.glb`,import.meta.url));
    const provenance=JSON.parse(readFileSync(new URL('../public/assets/supplied/provenance.json',import.meta.url),'utf8'))[kind];
    assert.equal(file.readUInt32LE(0),0x46546c67);assert.equal(file.readUInt32LE(8),file.length);assert.equal(file.length,provenance.output_bytes);
    assert.equal(createHash('sha256').update(file).digest('hex'),provenance.output_sha256);
    assert.ok(file.length<(kind==='craft'?4_500_000:3_000_000));
    const jsonLength=file.readUInt32LE(12),asset=JSON.parse(file.subarray(20,20+jsonLength).toString());
    assert.equal(asset.meshes.length,1);assert.ok(asset.buffers.every((b:any)=>!b.uri));assert.ok(!asset.animations?.length&&!asset.skins?.length);
    const primitives=asset.meshes.flatMap((m:any)=>m.primitives),triangles=primitives.reduce((n:number,p:any)=>n+asset.accessors[p.indices].count/3,0);
    assert.equal(triangles,provenance.triangles);assert.ok(triangles<(kind==='craft'?60_000:10_000));assert.ok(primitives.length<=(kind==='craft'?20:7));
    if(kind==='station'){
      const evidence=JSON.parse(readFileSync(new URL('../public/assets/supplied/station-optimization.json',import.meta.url),'utf8'));
      assert.equal(asset.images.length,15);assert.ok(asset.images.every((i:any)=>!i.uri&&i.mimeType==='image/webp'));
      assert.ok(evidence.images.every((i:any)=>i.pixels_equal&&i.width===512&&i.height===512));assert.equal(evidence.output_sha256,provenance.output_sha256);
      const dimensions=provenance.gltf_dimensions;assert.ok(dimensions[0]<=STATION_ASSEMBLY.size[0]&&dimensions[1]<=STATION_ASSEMBLY.size[1]&&dimensions[2]<=STATION_ASSEMBLY.size[2]+.00001);
    }else{
      assert.ok(!asset.images?.length,'uploaded FBX has material colors but no source maps');
      assert.ok(provenance.gltf_dimensions.every((n:number)=>n/2<=CRAFT_CLEARANCE));
      assert.ok(provenance.gltf_dimensions.every((n:number,i:number)=>n<=SHUTTLE_SIZE[i]));
    }
  }
});

test('parked hull blocks walking through the imported wings and keeps its aft hatch reachable',async()=>{
  await RAPIER.init();const world=new RAPIER.World({x:0,y:0,z:0});
  try{
    world.createCollider(RAPIER.ColliderDesc.cuboid(SHUTTLE_SIZE[0]/2,SHUTTLE_SIZE[1]/2,SHUTTLE_SIZE[2]/2).setTranslation(0,SHUTTLE_SIZE[1]/2,0));
    const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(-3.8,.9,0));
    const player=world.createCollider(RAPIER.ColliderDesc.capsule(.55,.3),body),controller=world.createCharacterController(.015);
    const hatch=world.createCollider(RAPIER.ColliderDesc.cuboid(.16,1.2,.16).setTranslation(0,1.2,SHUTTLE_HATCH_Z));world.step();
    controller.computeColliderMovement(player,{x:4,y:0,z:0});assert.ok(-3.8+controller.computedMovement().x< -SHUTTLE_SIZE[0]/2-.29);
    assert.ok(SHUTTLE_HATCH_Z-.16>SHUTTLE_SIZE[2]/2,'hatch and hull envelopes do not overlap');
    assert.equal(clearSight(world,{x:0,y:1.64,z:5},{x:0,y:1.2,z:SHUTTLE_HATCH_Z},player,hatch),true);
    assert.equal(clearSight(world,{x:0,y:1.64,z:-5},{x:0,y:1.2,z:SHUTTLE_HATCH_Z},player,hatch),false,'boarding remains blocked through the hull');
  }finally{world.free();}
});
