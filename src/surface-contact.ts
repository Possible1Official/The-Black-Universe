import * as THREE from 'three';

export type ContactKind='player'|'bike'|'rover'|'shuttle';
const kinds:ContactKind[]=['player','bike','rover','shuttle'];
// Soft ground occlusion, not a projected silhouette or physical shadow.
const footprint={player:[.42,.5,.38,2.4],bike:[.68,1.45,.4,3],rover:[1.15,1.95,.42,3],shuttle:[2.5,3.4,.36,10]} as const;
export type ContactPose={x:number;y:number;z:number;yaw:number;visible:boolean};
export function contactStrength(kind:ContactKind,gap:number){
  if(!Number.isFinite(gap))return 0;
  const t=THREE.MathUtils.clamp(Math.max(0,gap)/footprint[kind][3],0,1);
  return footprint[kind][2]*(1-t)*(1-t);
}

/** Four uniforms shared by terrain and pads: no extra draw, map or depth layer. */
export class SurfaceContact {
  private readonly ellipses={value:kinds.map(()=>new THREE.Vector4(0,0,1,1))};
  private readonly poses={value:kinds.map(()=>new THREE.Vector4(1,0,0,0))};
  clear(){for(const p of this.poses.value)p.z=0;}
  update(kind:ContactKind,pose:ContactPose,ground:number){
    const i=kinds.indexOf(kind),gap=pose.y-ground;
    if(!pose.visible||![pose.x,pose.y,pose.z,pose.yaw,ground].every(Number.isFinite)){this.poses.value[i].z=0;return;}
    const spread=1+THREE.MathUtils.clamp(gap,0,footprint[kind][3])*.12;
    this.ellipses.value[i].set(pose.x,pose.z,footprint[kind][0]*spread,footprint[kind][1]*spread);
    this.poses.value[i].set(Math.cos(pose.yaw),Math.sin(pose.yaw),contactStrength(kind,gap),0);
  }
  bind(material:THREE.MeshStandardMaterial){
    const before=material.onBeforeCompile,cache=material.customProgramCacheKey();
    material.onBeforeCompile=(shader,renderer)=>{
      before.call(material,shader,renderer);
      shader.uniforms.contactEllipses=this.ellipses;shader.uniforms.contactPoses=this.poses;
      shader.vertexShader='varying vec2 vContactXZ;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',
        'vContactXZ = (modelMatrix * vec4(transformed, 1.0)).xz;\n#include <project_vertex>');
      shader.fragmentShader='varying vec2 vContactXZ;\nuniform vec4 contactEllipses[4];\nuniform vec4 contactPoses[4];\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
        float contactVisibility = 1.0;
        for (int i = 0; i < 4; i++) {
          vec4 ellipse = contactEllipses[i], pose = contactPoses[i];
          vec2 d = vContactXZ - ellipse.xy;
          vec2 local = vec2(pose.x*d.x-pose.y*d.y, pose.y*d.x+pose.x*d.y) / ellipse.zw;
          float softContact = 1.0 - smoothstep(0.05, 1.0, length(local));
          // Strongest contact wins; overlapping bodies cannot turn ground black.
          contactVisibility = min(contactVisibility, 1.0-pose.z*softContact);
        }
        outgoingLight *= contactVisibility;
        #include <opaque_fragment>`);
    };
    material.customProgramCacheKey=()=>cache+'/surface-contact-v1';
    material.needsUpdate=true;
  }
  snapshot(){return kinds.map((kind,i)=>({kind,ellipse:this.ellipses.value[i].toArray(),pose:this.poses.value[i].toArray()}));}
}
