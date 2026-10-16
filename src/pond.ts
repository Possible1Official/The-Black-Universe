import * as THREE from 'three';
import {WATER_LEVEL} from './biomes';
import {pondGeometry,type TerrainMesh} from './pond-geometry';

/** One depth-tinted transparent receiver: no screen capture, extra light or wave displacement. */
export class Pond{
 readonly mesh:THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>;
 private readonly time={value:0};private readonly detail={value:1};
 constructor(terrain:TerrainMesh){
  const data=pondGeometry(terrain,WATER_LEVEL),geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(data.positions,3));geometry.setAttribute('pondDepth',new THREE.BufferAttribute(data.depths,1));geometry.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({color:0xffffff,metalness:0,roughness:.27,transparent:true,opacity:1,depthWrite:false});
  const shallow={value:new THREE.Color(0x4d8f87)},deep={value:new THREE.Color(0x0e3444)},sky={value:new THREE.Color(0x789ba8)};
  material.onBeforeCompile=shader=>{
   shader.uniforms.pondTime=this.time;shader.uniforms.pondDetail=this.detail;shader.uniforms.pondShallow=shallow;shader.uniforms.pondDeep=deep;shader.uniforms.pondSky=sky;
   shader.vertexShader='attribute float pondDepth; varying float vPondDepth; varying vec2 vPondXZ;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPondDepth=pondDepth; vPondXZ=position.xz;');
   shader.fragmentShader='uniform float pondTime; uniform float pondDetail; uniform vec3 pondShallow; uniform vec3 pondDeep; uniform vec3 pondSky; varying float vPondDepth; varying vec2 vPondXZ;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
    float pondDepthValue=max(0.0,vPondDepth);
    float pondAbsorb=1.0-exp(-pondDepthValue*2.7);
    diffuseColor.rgb=mix(pondShallow,pondDeep,pondAbsorb);
    diffuseColor.a *= smoothstep(0.0,0.16,pondDepthValue) * mix(0.30,0.95,pondAbsorb);
   `);
   shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`
    vec2 pondSlope=0.045*cos(dot(vPondXZ,vec2(0.9,0.6))+pondTime*0.9)*vec2(0.9,0.6);
    if(pondDetail>0.5) pondSlope += 0.025*cos(dot(vPondXZ,vec2(-0.65,0.95))+pondTime*0.65)*vec2(-0.65,0.95);
    normal=normalize(mat3(viewMatrix)*vec3(-pondSlope.x,1.0,-pondSlope.y));
   `);
   shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
    float pondFacing=clamp(dot(normal,normalize(vViewPosition)),0.0,1.0);
    float pondFresnel=0.02+0.98*pow(1.0-pondFacing,5.0);
    // Constant sky approximation, not a reflection of the scene or source of emitted light.
    outgoingLight=mix(outgoingLight,pondSky,pondFresnel*0.45);
    #include <opaque_fragment>
   `);
  };
  material.customProgramCacheKey=()=> 'terrain-pond-v1';this.mesh=new THREE.Mesh(geometry,material);this.mesh.name='NysaPond';this.mesh.receiveShadow=true;
 }
 update(dt:number,active:boolean){if(active&&Number.isFinite(dt))this.time.value+=THREE.MathUtils.clamp(dt,0,.05);}
 setQuality(high:boolean){this.detail.value=high?1:0;}
 snapshot(){return {time:this.time.value,high:this.detail.value===1,triangles:this.mesh.geometry.getAttribute('position').count/3,bytes:Object.values(this.mesh.geometry.attributes).reduce((sum,a)=>sum+a.array.byteLength,0)};}
}
