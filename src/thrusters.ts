import * as THREE from 'three';
// Small shared shader cones: stylized emission, not a fluid simulation or light.
const geometry=new THREE.ConeGeometry(.32,1,12,1,true);geometry.translate(0,.5,0);geometry.rotateX(Math.PI/2);
export function createThrusters(){
  const root=new THREE.Group();root.visible=false;
  const material=new THREE.ShaderMaterial({uniforms:{power:{value:0},time:{value:0}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:'varying vec2 uvP; void main(){uvP=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec2 uvP; uniform float power; uniform float time; void main(){float fade=pow(1.-uvP.y,1.5);float pulse=.92+.08*sin(time*37.+uvP.y*9.);vec3 col=mix(vec3(.65,.95,1.),vec3(.16,.38,1.),uvP.y);gl_FragColor=vec4(col,fade*pulse*power*.8);}'
  });
  const jets=[new THREE.Mesh(geometry,material),new THREE.Mesh(geometry,material)];root.add(...jets);
  return {root,update(actor:THREE.Group,power:number,time:number,ground:boolean){
    root.position.copy(actor.position);root.quaternion.copy(actor.quaternion);root.visible=actor.visible&&power>0;
    material.uniforms.power.value=power;material.uniforms.time.value=time;
    jets.forEach((jet,i)=>{const side=i===0?-1:1;
      jet.position.set(side*(actor.userData.authored?1.65:2.2),actor.userData.authored?1.25:.65,actor.userData.authored?2.85:2.6);
      jet.rotation.x=ground?Math.PI/2:0;jet.scale.set(ground?.7:1,ground?.7:1,(ground?1:1.2)+power*(ground?1.2:3));
    });
  }};
}
