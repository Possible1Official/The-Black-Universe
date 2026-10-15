import {test} from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {TurboFeedback} from '../src/turbo-feedback';
test('turbine response grows under drive, cuts immediately on brake/dismount, and freezes at zero dt',()=>{
 const fx=new TurboFeedback();for(let i=0;i<90;i++)fx.update(true,true,false,0,0,1/60);const idle=fx.power,length=fx.plume.scale.z;assert.ok(idle>.1&&idle<.13&&fx.root.visible);
 for(let i=0;i<90;i++)fx.update(true,true,false,.9,10,1/60);assert.ok(fx.power>idle*4&&fx.plume.scale.z>length*2);
 const frozen={power:fx.power,time:fx.time,length:fx.plume.scale.z};fx.update(false,false,true,0,0,0);assert.deepEqual({power:fx.power,time:fx.time,length:fx.plume.scale.z},frozen);
 fx.update(true,true,true,1,12,1/60);assert.equal(fx.power,0);assert.equal(fx.root.visible,false);
 fx.update(true,false,false,1,12,1/60);assert.equal(fx.root.visible,false);fx.update(false,true,false,1,12,1/60);assert.equal(fx.power,0);assert.equal(fx.root.visible,false);
});
test('turbine effect inherits chassis tilt, stays bounded and adds no light, map or shadow caster',()=>{
 const fx=new TurboFeedback(),chassis=new THREE.Group();chassis.rotation.set(.2,1,.15,'YXZ');chassis.position.set(3,2,4);chassis.add(fx.root);fx.update(true,true,false,10,100,.1);const p=fx.root.getWorldPosition(new THREE.Vector3());assert.ok(p.distanceTo(new THREE.Vector3(-.026,.409,1.23).applyQuaternion(chassis.quaternion).add(chassis.position))<1e-8);assert.ok(fx.power<1&&fx.plume.scale.z<=1.02);
 let triangles=0;fx.root.traverse(o=>{assert.ok(!(o instanceof THREE.Light));if(o instanceof THREE.Mesh){assert.equal(o.castShadow,false);assert.equal(o.material.depthWrite,false);assert.ok(!('map' in o.material)||!o.material.map);triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});assert.ok(triangles<=40);
});
