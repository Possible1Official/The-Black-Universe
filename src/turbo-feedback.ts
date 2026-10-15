import * as THREE from 'three';
const plumeGeometry=new THREE.ConeGeometry(.16,1,10,1,true);
plumeGeometry.translate(0,.5,0);plumeGeometry.rotateX(Math.PI/2);
const coreGeometry=new THREE.CircleGeometry(.145,16);
// The selected CGTrader model has a longitudinal turbine, not road wheels.
// One shared cone + disk, no texture/light/shadow or source-material mutation.
export class TurboFeedback{
 readonly root=new THREE.Group();readonly plume:THREE.Mesh;readonly core:THREE.Mesh;
 power=0;time=0;
 private readonly material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
  uniforms:{power:{value:0},time:{value:0}},
  vertexShader:'varying vec2 uvP;void main(){uvP=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying vec2 uvP;uniform float power;uniform float time;void main(){float fade=pow(1.-uvP.y,1.7);float pulse=.94+.06*sin(time*31.+uvP.y*12.);vec3 col=mix(vec3(.65,.92,1.),vec3(.08,.28,1.),uvP.y);gl_FragColor=vec4(col,fade*pulse*power*.7);}'
 });
 private readonly coreMaterial=new THREE.MeshBasicMaterial({color:0x8ae3ff,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
 constructor(){
  this.root.name='TurboTurbineFeedback';this.root.visible=false;this.root.position.set(-.026,.409,1.23);
  this.plume=new THREE.Mesh(plumeGeometry,this.material);this.core=new THREE.Mesh(coreGeometry,this.coreMaterial);this.root.add(this.plume,this.core);
 }
 update(engaged:boolean,visible:boolean,brake:boolean,demand:number,speed:number,dt:number){
  if(!Number.isFinite(dt)||dt<=0)return;
  this.time+=Math.min(dt,.1);
  const target=!engaged||brake?0:.12+.58*THREE.MathUtils.clamp(demand,0,1)+.2*THREE.MathUtils.clamp(speed/12,0,1);
  this.power=target===0?0:THREE.MathUtils.damp(this.power,target,9,Math.min(dt,.1));
  this.root.visible=visible&&this.power>.005;
  this.material.uniforms.power.value=this.power;this.material.uniforms.time.value=this.time;
  this.plume.scale.z=.12+this.power*.9;this.coreMaterial.opacity=this.power*.55;
 }
}
