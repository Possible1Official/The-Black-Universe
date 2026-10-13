import './style.css';
import {bulkheadPanels} from './bulkheads';
import {clearSight} from './visibility';
import {planEngineeringDuty,recordDutyMovement,type EngineeringDuty} from './crew-duty';
import {ShipLightBudget} from './light-budget';
import {batchStaticBoxes} from './batching';
import {FixedFrameClock,FIXED_STEP,MAX_FRAME_SECONDS,JUMP_BUFFER_SECONDS,stepJumpBuffer} from './timing';
import {missionDestination,routeWaypoint,navigationReading} from './navigation';
import {createSurface} from './surface';
import {LANDING,SAMPLE,SITE_HALF,SURFACE_ORIGIN,terrainHeight,landingBlock} from './excursion';
import {forgeReadiness,powerOutput,resetContainment,stepPower,type PowerProfile} from './power';
import {freshPatrol, planPatrol, recordPatrolMovement, turnToward, type PatrolState, type Point} from './patrol';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { activateForge, activateRelay, crewLine, freshProgress, parseProgress, RELAYS, SAVE_KEY, LEGACY_SAVE_KEY, type Relay } from './state';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('universe');
let progress = freshProgress();
try { progress = parseProgress(localStorage.getItem(SAVE_KEY)??localStorage.getItem(LEGACY_SAVE_KEY)); } catch { /* storage is optional */ }
let active=false, dialogueOpen=false, yaw=0, pitch=-.04, elapsed=0, toastTimer=0;
const keys=new Set<string>(), touchMove=new THREE.Vector2();
let renderer: THREE.WebGLRenderer;
try { renderer = new THREE.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance'}); }
catch { $('loading').textContent='This expedition needs WebGL 2. Try a browser with hardware acceleration enabled.'; $('play').setAttribute('disabled',''); throw new Error('WebGL unavailable'); }
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
renderer.setSize(innerWidth,innerHeight); renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.1;
const scene=new THREE.Scene(); scene.background=new THREE.Color('#02050d');
const camera=new THREE.PerspectiveCamera(68,innerWidth/innerHeight,.08,2500); camera.rotation.order='YXZ';
camera.position.set(0,1.7,16);
const composer=new EffectComposer(renderer); composer.addPass(new RenderPass(scene,camera));
const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.36,.6,1.1); composer.addPass(bloom); composer.addPass(new OutputPass());
scene.add(new THREE.HemisphereLight(0xa8c4da,0x10151f,1.1));
const sun=new THREE.DirectionalLight(0xcbe6ff,2.5);sun.position.set(30,50,-70);scene.add(sun);
const metal=new THREE.MeshStandardMaterial({color:0x263442,metalness:.75,roughness:.4});
const dark=new THREE.MeshStandardMaterial({color:0x101925,metalness:.65,roughness:.47});
const wallMat=new THREE.MeshStandardMaterial({color:0x425363,metalness:.62,roughness:.48});
const cyan=new THREE.MeshStandardMaterial({color:0x82e6ed,emissive:0x44bed1,emissiveIntensity:3});
const amber=new THREE.MeshStandardMaterial({color:0xefb475,emissive:0xdc7d39,emissiveIntensity:2});
const glass=new THREE.MeshPhysicalMaterial({color:0x8abdc5,metalness:.05,roughness:.12,transparent:true,opacity:.13,side:THREE.DoubleSide});
function box(w:number,h:number,d:number,x:number,y:number,z:number,mat:THREE.Material=metal,parent:THREE.Object3D=scene){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function sphere(r:number,x:number,y:number,z:number,mat:THREE.Material,parent:THREE.Object3D=scene){const m=new THREE.Mesh(new THREE.SphereGeometry(r,32,24),mat);m.position.set(x,y,z);parent.add(m);return m;}
const shipLights:{light:THREE.PointLight;base:number}[]=[];
function point(color:number,intensity:number,x:number,y:number,z:number,distance=15){const l=new THREE.PointLight(color,intensity,distance,2);l.position.set(x,y,z);scene.add(l);shipLights.push({light:l,base:intensity});return l;}
function textPanel(title:string,subtitle:string,color='#79e4ed'){
  const c=document.createElement('canvas');c.width=512;c.height=256;const ctx=c.getContext('2d')!;
  ctx.fillStyle='#06141f';ctx.fillRect(0,0,512,256);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.strokeRect(12,12,488,232);
  ctx.fillStyle=color;ctx.font='22px monospace';ctx.fillText('EREBUS // SYSTEM CONTROL',30,48);ctx.font='bold 39px sans-serif';ctx.fillText(title,30,108);ctx.font='20px monospace';ctx.fillText(subtitle,30,148);
  for(let i=0;i<14;i++){ctx.fillStyle=i%3===0?color:'#1d495b';ctx.fillRect(30+i*32,190,21,24);}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshBasicMaterial({map:t});
}
// Seeded procedural surfaces: no remote runtime assets.
function seeded(seed:number){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296;};}
const random=seeded(8204);
const floorCanvas=document.createElement('canvas');floorCanvas.width=floorCanvas.height=256;const fctx=floorCanvas.getContext('2d')!;
fctx.fillStyle='#69747a';fctx.fillRect(0,0,256,256);for(let i=0;i<2200;i++){fctx.fillStyle=`rgba(10,20,30,${random()*.18})`;fctx.fillRect(random()*256,random()*256,random()*25,1);}fctx.strokeStyle='#232b31';fctx.lineWidth=4;fctx.strokeRect(0,0,256,256);
const floorTex=new THREE.CanvasTexture(floorCanvas);floorTex.wrapS=floorTex.wrapT=THREE.RepeatWrapping;floorTex.repeat.set(11,19);floorTex.colorSpace=THREE.SRGBColorSpace;
const floorMat=new THREE.MeshStandardMaterial({map:floorTex,color:0x657483,metalness:.72,roughness:.46});
box(22,.3,38,0,-.15,3,floorMat);box(8,.3,14,-15,-.15,7,floorMat);box(8,.3,14,15,-.15,7,floorMat);
box(22,.25,38,0,5.25,3,dark);box(8,.25,14,-15,5.25,7,dark);box(8,.25,14,15,5.25,7,dark);
box(22,5.5,.5,0,2.5,22,wallMat);box(.4,5.5,14,-19,2.5,7,wallMat);box(.4,5.5,14,19,2.5,7,wallMat);
for(const x of [-15,15])for(const z of [0,14])box(8,5.5,.4,x,2.5,z,wallMat);
// Side walls leave a real doorway between z=4 and z=8.
for(const x of [-11,11]){box(.4,5.5,20,x,2.5,-6,wallMat);box(.4,5.5,14,x,2.5,15,wallMat);box(.6,2,4,x,4.25,6,dark);}
// Panoramic forward window and structural ribs.
box(22,1,.4,0,.5,-16,metal);box(22,1,.4,0,4.8,-16,metal);box(21,3.8,.05,0,2.8,-16,glass);
for(const x of [-10.8,-6,6,10.8])box(.16,4,.25,x,2.7,-16,dark);
for(let z=-14;z<=20;z+=4){for(const x of [-10.6,10.6]){box(.25,4.8,.35,x,2.4,z,metal);box(.04,3.5,.08,x+(x<0?.16:-.16),2.6,z,cyan);}box(21,.13,.35,0,5,z,metal);box(12,.04,.1,0,4.9,z,cyan);}
for(const x of [-8,8]){box(.045,.015,34,x,.018,3,cyan);for(let z=-12;z<20;z+=4)box(.8,.03,.15,x,.03,z,amber);}
for(const x of [-6,6])for(const z of [-8,5,17]){point(0x79c9ed,20,x,4.5,z,12);box(3,.06,.5,x,5,z,cyan);}
point(0xffa763,38,-15,4,7,13);point(0x79ddff,38,15,4,7,13);
const ceilingSpot=new THREE.SpotLight(0xc7eaff,110,30,Math.PI/3,.6,1.4);ceilingSpot.position.set(0,4.8,4);ceilingSpot.target.position.set(0,0,-7);ceilingSpot.castShadow=true;ceilingSpot.shadow.mapSize.set(1024,1024);scene.add(ceilingSpot,ceilingSpot.target);
// Central bridge dais and seating.
box(7,.18,5,0,.09,-10,dark);for(const x of [-3.4,3.4])box(.035,.03,4.8,x,.2,-10,cyan);
for(const x of [-7,7]){box(1.1,.15,1.1,x,.6,-7,dark);box(1,.95,.18,x,1.1,-6.5,metal);box(.14,.8,.14,x,.3,-7,metal);}
box(5,.7,1.6,0,.4,19,metal);box(4,.1,.9,0,.79,19,textPanel('EREBUS','EXPEDITION 001'));
// Universe forge: kilometer-scale impression through staged distance, rings, trusses and orbiting fragments.
const forge=new THREE.Group();forge.position.set(0,8,-105);scene.add(forge);
const forgeBody=new THREE.Mesh(new THREE.TorusGeometry(7.8,.85,12,96),metal);forge.add(forgeBody);
const forgeLight=sphere(4.8,0,0,0,new THREE.MeshBasicMaterial({color:0xb3efff}),forge);
const rings:THREE.Mesh[]=[];
for(let i=0;i<5;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(12+i*3.2,.18+(i%2)*.35,8,128),i%2?metal:cyan);ring.rotation.set(i*.57,i*.68,i*.4);forge.add(ring);rings.push(ring);}
const pylons=new THREE.Group();forge.add(pylons);
for(let i=0;i<12;i++){const a=i*Math.PI/6;const p=new THREE.Group();p.position.set(Math.cos(a)*21,Math.sin(a)*21,0);p.rotation.z=a;box(8,1.1,2,0,0,0,metal,p);box(5,.08,2.08,0,.6,0,cyan,p);box(2,3,3,3,0,0,dark,p);pylons.add(p);}
const shell=new THREE.Mesh(new THREE.IcosahedronGeometry(9,1),new THREE.MeshBasicMaterial({color:0x70cbd4,wireframe:true,transparent:true,opacity:.22}));forge.add(shell);
const halo=new THREE.Mesh(new THREE.TorusGeometry(31,.12,8,160),amber);halo.rotation.x=.7;forge.add(halo);
const starsGeo=new THREE.BufferGeometry();const stars=new Float32Array(3500*3);for(let i=0;i<3500;i++){const a=random()*Math.PI*2,b=Math.acos(2*random()-1),r=800+random()*700;stars.set([Math.sin(b)*Math.cos(a)*r,Math.cos(b)*r,Math.sin(b)*Math.sin(a)*r],i*3);}starsGeo.setAttribute('position',new THREE.BufferAttribute(stars,3));scene.add(new THREE.Points(starsGeo,new THREE.PointsMaterial({color:0xb8d4e8,size:1.2,sizeAttenuation:true})));
const planetMat=new THREE.MeshStandardMaterial({color:0x548cb1,roughness:.9,metalness:.05});
const pc=document.createElement('canvas');pc.width=1024;pc.height=512;const pctx=pc.getContext('2d')!;pctx.fillStyle='#20516d';pctx.fillRect(0,0,1024,512);for(let i=0;i<160;i++){const x=random()*1024,y=random()*512;pctx.fillStyle=i%4===0?'#9fc3c5':'#5b8470';pctx.beginPath();pctx.ellipse(x,y,10+random()*65,5+random()*30,random()*Math.PI,0,Math.PI*2);pctx.fill();}const planetTex=new THREE.CanvasTexture(pc);planetTex.colorSpace=THREE.SRGBColorSpace;planetMat.map=planetTex;
const planet=sphere(20,95,-12,-190,planetMat);const atmosphere=sphere(20.6,95,-12,-190,new THREE.MeshBasicMaterial({color:0x67b7e9,transparent:true,opacity:.15,side:THREE.BackSide}));planet.visible=atmosphere.visible=progress.forged;
sphere(65,-350,90,-850,new THREE.MeshStandardMaterial({color:0x806b78,roughness:1}));
// Reactor with nested containment chambers.
const reactor=new THREE.Group();reactor.position.set(-15,1.8,4);scene.add(reactor);
const reactorMaterial=cyan.clone();
const reactorCore=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,3,32),reactorMaterial);reactor.add(reactorCore);
for(const y of [-1.4,1.4]){const rim=new THREE.Mesh(new THREE.TorusGeometry(1.35,.16,8,48),metal);rim.rotation.x=Math.PI/2;rim.position.y=y;reactor.add(rim);}
for(let i=0;i<6;i++){const a=i*Math.PI/3;box(.15,3.4,.15,Math.cos(a)*1.3,0,Math.sin(a)*1.3,metal,reactor);}const reactorLight=point(0x67cfe6,18,-15,1.8,4,8);
// Star chart projection in the observatory.
const chart=new THREE.Group();chart.position.set(15,1.5,4);scene.add(chart);box(3,.7,3,15,.35,4,dark);
for(let i=0;i<3;i++){const r=new THREE.Mesh(new THREE.TorusGeometry(.6+i*.45,.018,6,64),cyan);r.rotation.x=Math.PI/2+i*.1;chart.add(r);}sphere(.2,0,0,0,amber,chart);
box(5,2,.15,15,2.7,.23,textPanel('OBSERVATORY','SPECTRAL ARRAY / ONLINE'));
box(5,2,.15,-15,2.7,.23,textPanel('ENGINEERING','CONTAINMENT / NOMINAL','#edb378'));

const solids:{size:number[];pos:number[];target?:Target}[]=[];
function solid(w:number,h:number,d:number,x:number,y:number,z:number,target?:Target){solids.push({size:[w,h,d],pos:[x,y,z],target});}
let onSurface=false;
type Target={zone?:'surface';name:string;position:THREE.Vector3;action:()=>void;screen?:THREE.Mesh;collider?:RAPIER.Collider;};
const targets:Target[]=[];
function terminal(name:string,x:number,z:number,title:string,subtitle:string,action:()=>void,screenMaterial?:THREE.Material){box(1.8,.9,1,x,.5,z,dark);const screen=box(1.6,.07,.9,x,1.04,z,screenMaterial??textPanel(title,subtitle));screen.rotation.x=.26;box(.12,.65,.12,x-.75,1.37,z-.4,cyan);const t={name,position:new THREE.Vector3(x,1.1,z),action,screen};targets.push(t);solid(1.8,1.1,1,x,.55,z,t);return t;}
function notify(message:string){$('toast').textContent=message;$('toast').style.opacity='1';toastTimer=5;}
let storageWarned=false;
function save(refresh=true){try{localStorage.setItem(SAVE_KEY,JSON.stringify(progress));}catch{if(!storageWarned){notify('Storage unavailable. Progress will last for this session.');storageWarned=true;}}if(refresh){updateHud();if(player)paintNavigation();}}
function relayAction(r:Relay){if(progress.relays.includes(r)){notify(`${r.toUpperCase()} relay already online.`);return;}progress=activateRelay(progress,r);save();notify(`${r.toUpperCase()} relay online · ${progress.relays.length}/3 synchronized`);tone(330+progress.relays.length*110);}
const relayTargets=[terminal('Restore engineering relay',-16,10,'POWER RELAY','01 / ENGINEERING',()=>relayAction('engineering')),terminal('Restore navigation relay',-5,-11,'NAVIGATION','02 / BRIDGE ARRAY',()=>relayAction('navigation')),terminal('Restore observatory relay',16,10,'SPECTRAL ARRAY','03 / OBSERVATORY',()=>relayAction('observatory'))];
terminal('Initialize universe forge',0,-11,'THE ARCHITECT','GENESIS CONTROL',()=>{if(progress.forged){notify('Genesis complete. Your new world is visible beyond the starboard bow.');return;}if(progress.relays.length<3){notify(`Genesis locked. Restore ${3-progress.relays.length} remaining power relay(s).`);tone(120);return;}const blocked=forgeReadiness(progress.power,progress.relays.length);if(blocked){notify(blocked);tone(120);return;}progress=activateForge(progress);planet.visible=atmosphere.visible=true;save();notify('GENESIS COMPLETE · New world designated Nysa.');tone(660);});
terminal('Scan the new world',5,-11,'DEEP SCAN','TARGET / NYSA',()=>{
  showDialogue('EREBUS / SCIENCE ARRAY',progress.forged?'NYSA · Atmosphere: nitrogen and oxygen. Survey site located. Deploy through the transfer link, collect a luminous outcrop sample, then use the extraction beacon to return. This is a bounded survey excursion.':'No terrestrial signatures. Initialize the architect to create Nysa.');
  $('expeditionPanel').hidden=!progress.forged;
  $<HTMLButtonElement>('deployNysa').disabled=landingBlock(progress.forged,progress.power.tripped)!==null;
});
terminal('Open engineering diagnostics',-13.5,11.7,'CONTAINMENT','POWER ROUTING',showPower);
let world:RAPIER.World, player:RAPIER.RigidBody, playerCollider:RAPIER.Collider, controller:RAPIER.KinematicCharacterController;
solid(22,.3,38,0,-.15,3);solid(8,.3,14,-15,-.15,7);solid(8,.3,14,15,-.15,7);solid(22,5.5,.5,0,2.5,22);solid(22,5.5,.4,0,2.5,-16);
for(const x of [-11,11]){solid(.4,5.5,20,x,2.5,-6);solid(.4,5.5,14,x,2.5,15);}
for(const x of [-19,19])solid(.4,5.5,14,x,2.5,7);
for(const x of [-15,15])for(const z of [0,14])solid(8,5.5,.4,x,2.5,z);
solid(2.8,3,2.8,-15,1.5,4);solid(3,.7,3,15,.35,4);solid(5,.8,1.6,0,.4,19);
solid(7,.18,5,0,.09,-10);
for(const x of [-7,7])solid(1.1,1.55,1.1,x,.775,-7);
const doors:{mesh:THREE.Mesh;open:boolean;collider?:RAPIER.Collider;progress:number;x:number}[]=[];
const accessScreen=textPanel('ACCESS','BULKHEAD CONTROL');
for(const x of [-11,11]){
  const mesh=box(.28,3.2,3.9,x,1.6,6,dark);box(.3,.03,3.7,0,.6,0,cyan,mesh);
  const door={mesh,open:false,progress:0,x};doors.push(door);
  const toggle=()=>{door.open=!door.open;notify(`Bulkhead ${door.open?'opening':'closing'}`);tone(220);};
  for(const panel of bulkheadPanels(x))terminal(panel.name,panel.x,panel.z,'ACCESS','BULKHEAD CONTROL',toggle,accessScreen);
}
// Temporary articulated crew androids. Asset pipeline replaces these with licensed skinned characters.
interface CrewMember {
  name: string; mesh: THREE.Group; legs: THREE.Group[]; arms: THREE.Group[];
  target: Target; route: [Point, Point]; state: PatrolState; duty: EngineeringDuty|null; visitorVisible:boolean; sightWait:number; gait: number; walkBlend: number;
  body?: RAPIER.RigidBody; collider?: RAPIER.Collider; controller?: RAPIER.KinematicCharacterController;
}
const crew: CrewMember[] = [];
let speakingCrew: string | undefined;
function makeCrew(name:string,x:number,z:number,color:number){
  const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
  const suit=new THREE.MeshStandardMaterial({color,metalness:.45,roughness:.42});
  const trim=new THREE.MeshStandardMaterial({color:0x637481,metalness:.8,roughness:.32});
  box(.48,.64,.29,0,1.15,0,suit,g);sphere(.17,0,1.72,0,trim,g);
  box(.3,.08,.06,0,1.73,.15,cyan,g);box(.12,.06,.04,-.1,1.3,.16,amber,g);
  const legs:THREE.Group[]=[], arms:THREE.Group[]=[];
  for(const side of [-1,1]){
    const leg=new THREE.Group();leg.position.set(side*.14,.86,0);g.add(leg);
    box(.17,.6,.17,0,-.3,0,suit,leg);sphere(.1,0,-.6,0,trim,leg);
    box(.15,.25,.16,0,-.72,0,trim,leg);box(.19,.1,.32,0,-.82,.07,dark,leg);legs.push(leg);
    const arm=new THREE.Group();arm.position.set(side*.34,1.38,0);g.add(arm);
    box(.15,.4,.17,0,-.2,0,suit,arm);sphere(.09,0,-.42,0,trim,arm);
    box(.12,.24,.14,0,-.55,0,trim,arm);arms.push(arm);
  }
  const target={name:`Speak with ${name}`,position:g.position.clone().add(new THREE.Vector3(0,1.2,0)),action:()=>{
    speakingCrew=name;showDialogue(`OFFICER ${name}`,crewLine(name,progress));
  }};
  targets.push(target);
  const route:[Point,Point]=name==='VEGA'?[{x,z:z-1},{x,z:z+1.5}]:[{x,z},{x:x+1.5,z:z+1.5}];
  crew.push({name,mesh:g,legs,arms,target,route,state:freshPatrol(),duty:null,visitorVisible:false,sightWait:0,gait:0,walkBlend:0});
}
makeCrew('VEGA',-3,-7,0x294b62);makeCrew('ION',-16,7,0x88684d);
function stepCrew(){
  const visitor=player.translation();
  for(const c of crew){
    const body=c.body!, collider=c.collider!, controller=c.controller!;
    const p=body.translation();
    c.sightWait-=fixed;
    if(Math.hypot(visitor.x-p.x,visitor.z-p.z)>2.3){c.visitorVisible=false;c.sightWait=0;}
    else if(c.sightWait<=0){c.visitorVisible=clearSight(world,{x:p.x,y:p.y+.8,z:p.z},{x:visitor.x,y:visitor.y+.74,z:visitor.z},collider,playerCollider);c.sightWait=.1;}
    const plan=c.name==='ION'?planEngineeringDuty(c.duty,c.state,p,c.route,visitor,fixed,progress.power.tripped,speakingCrew===c.name,c.visitorVisible):{duty:null,...planPatrol(c.state,p,c.route,visitor,fixed,speakingCrew===c.name,c.visitorVisible)};
    c.duty=plan.duty;
    const dx=plan.facing.x-p.x,dz=plan.facing.z-p.z;
    const heading=Math.atan2(dx,dz);
    if(Math.hypot(dx,dz)>.05)c.mesh.rotation.y=turnToward(c.mesh.rotation.y,heading,fixed);
    const angle=Math.atan2(Math.sin(heading-c.mesh.rotation.y),Math.cos(heading-c.mesh.rotation.y));
    const turning=plan.state.mode==='patrolling'&&Math.abs(angle)>.3;
    const desired=turning?{x:0,z:0}:plan.displacement;
    controller.computeColliderMovement(collider,{x:desired.x,y:-.2*fixed,z:desired.z});
    const move=controller.computedMovement();
    const distance=Math.hypot(move.x,move.z), intended=Math.hypot(desired.x,desired.z);
    const forwardProgress=intended>0?Math.max(0,(move.x*desired.x+move.z*desired.z)/intended):0;
    if(c.duty){c.duty=recordDutyMovement(c.duty,intended,forwardProgress,fixed,p);c.state=plan.state;}
    else c.state=recordPatrolMovement(plan.state,intended,forwardProgress,fixed);
    body.setNextKinematicTranslation({x:p.x+move.x,y:p.y+move.y,z:p.z+move.z});
    c.gait+=distance/.85*Math.PI*2;
    c.walkBlend=THREE.MathUtils.damp(c.walkBlend,Math.min(1,distance/(.65*fixed)),12,fixed);
  }
}
function syncCrew(){
  for(const c of crew){
    const p=c.body!.translation();c.mesh.position.set(p.x,p.y-.925,p.z);
    c.target.position.set(p.x,p.y+.45,p.z);
    c.legs.forEach((leg,i)=>leg.rotation.x=Math.sin(c.gait+i*Math.PI)*.38*c.walkBlend);
    c.arms.forEach((arm,i)=>arm.rotation.x=-Math.sin(c.gait+i*Math.PI)*.26*c.walkBlend);
  }
}
function updateHud(){const spans=$('relays').children;RELAYS.forEach((r,i)=>spans[i].classList.toggle('done',progress.relays.includes(r)));$('system').textContent=progress.forged?'GENESIS STABLE':`POWER RELAYS ${progress.relays.length}/3`;$('objective').textContent=progress.forged?'A universe begins':progress.relays.length===3?'Initialize the architect':'Awaken the architect';$('missionText').textContent=progress.forged?(progress.surveyed?'Nysa sample secured. The bridge science array can redeploy you to the survey site.':'Scan Nysa from the bridge science array, deploy to the surface and survey the luminous outcrop.'):progress.relays.length===3?'All relays synchronized. Use the central architect terminal at the forward window.':'Restore three power relays, then initialize the universe forge from the bridge.';if(onSurface){$('objective').textContent=progress.surveyed?'Return to Erebus':'Survey the luminous outcrop';$('missionText').textContent=progress.surveyed?'Sample secured. Return to the extraction beacon on the circular landing pad.':'Walk toward the luminous outcrop northeast of the landing pad. Interact with E to secure a sample.';}relayTargets.forEach((t,i)=>{const relay:Relay[]=['engineering','navigation','observatory'];if(t.screen&&t.screen.userData.online!==progress.relays.includes(relay[i])){const old=t.screen.material as THREE.MeshBasicMaterial;old.map?.dispose();old.dispose();t.screen.userData.online=progress.relays.includes(relay[i]);t.screen.material=textPanel(relay[i].toUpperCase(),progress.relays.includes(relay[i])?'RELAY / ONLINE':'RELAY / STANDBY',progress.relays.includes(relay[i])?'#83f0c1':'#79e4ed');}});}
let audioContext:AudioContext|undefined,hum:GainNode|undefined;
function initAudio(){try{audioContext??=new AudioContext();void audioContext.resume();if(!hum){hum=audioContext.createGain();hum.gain.value=.018;hum.connect(audioContext.destination);for(const f of [48,72]){const o=audioContext.createOscillator();o.frequency.value=f;o.connect(hum);o.start();}}hum.gain.value=$<HTMLInputElement>('audio').checked?.018:0;}catch{ /* silent fallback */ }}
function tone(frequency:number){if(!audioContext||!$<HTMLInputElement>('audio').checked)return;const o=audioContext.createOscillator(),g=audioContext.createGain();o.frequency.value=frequency;g.gain.setValueAtTime(.05,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.4);o.connect(g);g.connect(audioContext.destination);o.start();o.stop(audioContext.currentTime+.4);}
function showDialogue(name:string,line:string){$('powerPanel').hidden=true;$('expeditionPanel').hidden=true;dialogueOpen=true;clearInput();$('speaker').textContent=name;$('speech').textContent=line;$('dialogue').hidden=false;paintNavigation();document.exitPointerLock?.();}
function closeDialogue(){save(false);clearInput();$('powerPanel').hidden=true;$('expeditionPanel').hidden=true;dialogueOpen=false;speakingCrew=undefined;$('dialogue').hidden=true;paintNavigation();if(active&&!matchMedia('(pointer:coarse)').matches)void canvas.requestPointerLock()?.catch(()=>{});}
$('closeDialogue').onclick=closeDialogue;
function pause(){save(false);active=false;clearInput();powerAccumulator=0;paintNavigation();$('overlay').hidden=false;$('play').innerHTML='RESUME EXPEDITION <span>↗</span>';document.exitPointerLock?.();if(hum)hum.gain.value=0;}
$('menu').onclick=pause;
$('play').onclick=()=>{clearInput();skipPowerFrame=true;active=true;$('overlay').hidden=true;paintNavigation();initAudio();if(!matchMedia('(pointer:coarse)').matches)void canvas.requestPointerLock()?.catch(()=>notify('Click the scene to enable mouse look.'));};
canvas.onclick=()=>{if(active&&!dialogueOpen&&!matchMedia('(pointer:coarse)').matches)void canvas.requestPointerLock()?.catch(()=>{});};
$('audio').onchange=()=>{if(active)initAudio();};
$('quality').onchange=()=>{const high=$<HTMLSelectElement>('quality').value==='high';renderer.setPixelRatio(Math.min(devicePixelRatio,high?1.75:1));renderer.shadowMap.enabled=high;bloom.enabled=high;surface.setQuality(high);lightBudget.configure(high,!onSurface);resize();};
$('reset').onclick=()=>{if(onSurface)travel(false);progress=freshProgress();save();planet.visible=atmosphere.visible=false;notify('Mission progress reset.');};
function showPower(){
  speakingCrew=undefined;
  showDialogue('ENGINEERING / POWER DISTRIBUTION','Balance the forge bus against thermal load. Sustained Genesis routing reduces cooling and can trip containment. Life support remains on emergency power during a trip.');
  $('powerPanel').hidden=false;paintPower();
}
for(const button of Array.from(document.querySelectorAll<HTMLButtonElement>('[data-profile]')))button.onclick=()=>{
  if(!active||!dialogueOpen||$('powerPanel').hidden)return;
  const profile=button.dataset.profile as PowerProfile;
  if(!['balanced','genesis','cooling'].includes(profile))return;
  progress={...progress,power:{...progress.power,profile}};save(false);paintPower();tone(330);
};
$('resetContainment').onclick=()=>{
  if(!active||!dialogueOpen||$('powerPanel').hidden)return;
  const next=resetContainment(progress.power);
  if(progress.power.tripped&&!next.tripped){progress={...progress,power:next};save(false);paintPower();notify('Containment reset. Balanced routing restored.');tone(440);}
};
const thermalCold=new THREE.Color(0x44bed1),thermalHot=new THREE.Color(0xff4c32);
function paintPower(){
  const p=progress.power,output=powerOutput(p,progress.relays.length);
  const heat=Math.round(p.heat);
  $('powerSummary').textContent=`${p.profile.toUpperCase()} · FORGE ${Math.round(output.forge)}%`;
  $('thermalSummary').textContent=`THERMAL ${heat}% · ${output.status.toUpperCase()}`;
  $('powerHud').dataset.status=output.status;
  $('system').textContent=p.tripped?'CONTAINMENT TRIPPED':progress.forged?'GENESIS STABLE':`POWER RELAYS ${progress.relays.length}/3`;
  if(!$('powerPanel').hidden){
    $('heatValue').textContent=`${heat}%`;$<HTMLMeterElement>('heatMeter').value=p.heat;
    $('forgeValue').textContent=`${Math.round(output.forge)}%`;
    $('containmentStatus').textContent=p.tripped?'CONTAINMENT TRIPPED · Forge isolated':p.heat>=75?'THERMAL WARNING · Switch to Cooling':'CONTAINMENT NOMINAL';
    $<HTMLButtonElement>('resetContainment').disabled=!p.tripped||p.heat>40;
    for(const button of Array.from(document.querySelectorAll<HTMLButtonElement>('[data-profile]')))button.setAttribute('aria-pressed',String(button.dataset.profile===p.profile));
  }
}
function powerVisuals(){
  const p=progress.power,output=powerOutput(p,progress.relays.length);
  for(const {light,base} of shipLights)light.intensity=base*output.habitat;
  ceilingSpot.intensity=110*output.habitat;
  reactorMaterial.emissive.copy(thermalCold).lerp(thermalHot,p.tripped?1:THREE.MathUtils.clamp((p.heat-55)/40,0,1));
  reactorMaterial.emissiveIntensity=p.tripped?1.4:2.5+.4*Math.sin(elapsed*(p.profile==='genesis'?6:2));
  reactorLight.color.copy(reactorMaterial.emissive);
  (forgeLight.material as THREE.MeshBasicMaterial).color.setHex(0xb3efff).multiplyScalar(.3+output.forge/100);
}
let powerAccumulator=0,powerSaveTimer=0,powerPaintTimer=0;
function advancePower(dt:number){
  powerAccumulator+=dt;
  while(powerAccumulator>=fixed){
    const wasTripped=progress.power.tripped;
    progress={...progress,power:stepPower(progress.power,progress.relays.length,fixed)};
    if(!wasTripped&&progress.power.tripped){notify('CONTAINMENT TRIPPED · Cool and reset at engineering diagnostics.');tone(110);save(false);}
    powerAccumulator-=fixed;powerSaveTimer+=fixed;
  }
  if(powerSaveTimer>=15){save(false);powerSaveTimer=0;}
  powerPaintTimer+=dt;if(powerPaintTimer>=.2){paintPower();powerPaintTimer=0;}
}
const batching=batchStaticBoxes(scene,new Set<THREE.Object3D>([...doors.map(d=>d.mesh),...targets.flatMap(t=>t.screen?[t.screen]:[])]));
const lightBudget=new ShipLightBudget(shipLights.map(({light})=>light));
scene.add(...lightBudget.proxies);
const shipNodes=scene.children.filter(node=>node!==sun&&!(node instanceof THREE.HemisphereLight));
const shipVisibility=new Map<THREE.Object3D,boolean>();
const surface=createSurface();scene.add(surface.group);
const surfaceSky=new THREE.Color(0x678b9a);
function travel(landing:boolean){
  clearInput();verticalSpeed=0;nearest=undefined;speakingCrew=undefined;
  if(landing){for(const node of shipNodes){shipVisibility.set(node,node.visible);node.visible=false;}}
  else {for(const [node,visible] of shipVisibility)node.visible=visible;shipVisibility.clear();}
  onSurface=landing;surface.group.visible=landing;lightBudget.configure($<HTMLSelectElement>('quality').value==='high',!landing);
  scene.background=landing?surfaceSky:new THREE.Color('#02050d');scene.fog=landing?new THREE.FogExp2(surfaceSky,.008):null;
  const spawn=landing?{x:SURFACE_ORIGIN+LANDING.x,y:1.05,z:LANDING.z}:{x:5,y:.9,z:-8.7};
  player.setTranslation(spawn,true);player.setNextKinematicTranslation(spawn);yaw=0;pitch=-.08;
  camera.position.set(spawn.x,spawn.y+.74,spawn.z);camera.rotation.set(pitch,yaw,0);
  updateHud();paintNavigation();save(false);notify(landing?'NYSA / SURVEY SITE · Locate the luminous outcrop.':'EREBUS / COMMAND DECK · Extraction complete.');
}
$('deployNysa').onclick=()=>{
  if(!active||!dialogueOpen||$('expeditionPanel').hidden)return;
  const blocked=landingBlock(progress.forged,progress.power.tripped);if(blocked){notify(blocked);return;}
  closeDialogue();travel(true);
};
const sampleTarget:Target={zone:'surface',name:'Survey luminous outcrop',position:new THREE.Vector3(SURFACE_ORIGIN+SAMPLE.x,terrainHeight(SAMPLE.x,SAMPLE.z)+.8,SAMPLE.z),action:()=>{
  if(!progress.surveyed){progress={...progress,surveyed:true};save();tone(660);notify('SAMPLE SECURED · Return to the landing beacon.');}
  else notify('Outcrop surveyed. Return through the extraction beacon.');
}};targets.push(sampleTarget);
const extractionTarget:Target={zone:'surface',name:'Extract to Erebus',position:new THREE.Vector3(SURFACE_ORIGIN,1.2,LANDING.z+2.4),action:()=>travel(false)};targets.push(extractionTarget);
let navigationTimer=0;
function paintNavigation(){
  const visible=active&&!dialogueOpen;
  $('navigationHud').hidden=!visible;
  if(!visible)return;
  const position=player.translation(),destination=missionDestination(progress,onSurface);
  const waypoint=onSurface?destination:routeWaypoint(destination,position,doors.map(d=>d.open));
  const reading=navigationReading(position,yaw,waypoint);
  $('compassHeading').textContent=`${reading.direction} / ${String(Math.round(reading.heading)%360).padStart(3,'0')}°`;
  $('navLabel').textContent=waypoint.label;
  $('navDistance').textContent=`${reading.distance<10?reading.distance.toFixed(1):Math.round(reading.distance)} m · ${reading.turn}`;
  $('navArrow').style.transform=`rotate(${reading.relativeDegrees.toFixed(1)}deg)`;
  $('navHint').textContent=waypoint.hint;
  $('navigationHud').dataset.destination=destination.id;
  $('navigationHud').dataset.waypoint=waypoint.id;
}
let nearest:Target|undefined;
function selectTarget(){
  let selected:Target|undefined,best=2.65;const forward=camera.getWorldDirection(new THREE.Vector3());
  for(const t of targets){if((t.zone==='surface')!==onSurface)continue;const direction=t.position.clone().sub(camera.position),distance=direction.length();
    if(distance<best&&direction.normalize().dot(forward)>.45&&clearSight(world,camera.position,t.position,playerCollider,t.collider)){selected=t;best=distance;}
  }return selected;
}
function interact(){if(!active||dialogueOpen)return;nearest=selectTarget();nearest?.action();}
$('touchAction').onclick=interact;
window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)&&active&&!dialogueOpen)e.preventDefault();if(e.code==='Escape'){if(dialogueOpen)closeDialogue();else if(active)pause();return;}if(!active||dialogueOpen)return;if(e.code==='KeyE'&&!e.repeat)interact();if(e.code==='Space'){if(!e.repeat)jumpBuffer=JUMP_BUFFER_SECONDS;return;}keys.add(e.code);});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{if(active)pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&active)pause();});
document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement&&active&&!dialogueOpen&&!matchMedia('(pointer:coarse)').matches)pause();});
window.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&active&&!dialogueOpen){yaw-=e.movementX*.002;pitch=THREE.MathUtils.clamp(pitch-e.movementY*.002,-1.35,1.35);}});
let lookPointer:number|undefined,lastLook=new THREE.Vector2();canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'||!active||dialogueOpen)return;lookPointer=e.pointerId;lastLook.set(e.clientX,e.clientY);canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(e.pointerId!==lookPointer)return;yaw-=(e.clientX-lastLook.x)*.004;pitch=THREE.MathUtils.clamp(pitch-(e.clientY-lastLook.y)*.004,-1.35,1.35);lastLook.set(e.clientX,e.clientY);});canvas.addEventListener('pointerup',()=>lookPointer=undefined);canvas.addEventListener('pointercancel',()=>lookPointer=undefined);
const stick=$('stick'),thumb=$('thumb');let stickPointer:number|undefined;
const joystickClicks=new Set<number>();
document.addEventListener('pointerdown',e=>{if(!stick.contains(e.target as Node))joystickClicks.delete(e.pointerId);},true);
document.addEventListener('click',e=>{if(e instanceof PointerEvent&&joystickClicks.has(e.pointerId)){e.preventDefault();e.stopImmediatePropagation();joystickClicks.delete(e.pointerId);}},true);
stick.onpointerdown=e=>{if(!active||dialogueOpen)return;stickPointer=e.pointerId;joystickClicks.add(e.pointerId);stick.setPointerCapture(e.pointerId);moveStick(e);};
function moveStick(e:PointerEvent){const r=stick.getBoundingClientRect();touchMove.set((e.clientX-r.left-r.width/2)/38,(e.clientY-r.top-r.height/2)/38);if(touchMove.length()>1)touchMove.normalize();thumb.style.transform=`translate(${touchMove.x*32}px,${touchMove.y*32}px)`;}
stick.onpointermove=e=>{if(e.pointerId===stickPointer)moveStick(e);};stick.onpointerup=stick.onpointercancel=e=>{stickPointer=undefined;touchMove.set(0,0);thumb.style.transform='';if(e.type==='pointercancel')joystickClicks.delete(e.pointerId);else setTimeout(()=>joystickClicks.delete(e.pointerId),500);};
function clearInput(){jumpBuffer=0;motionClock.reset();discardMovementFrame=true;velocity.set(0,0,0);keys.clear();touchMove.set(0,0);stickPointer=undefined;lookPointer=undefined;thumb.style.transform='';}
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(innerWidth,innerHeight);}window.addEventListener('resize',resize);
const motionClock=new FixedFrameClock();let discardMovementFrame=true,skipPowerFrame=true,lastMotionSteps=0,motionStepsTotal=0,droppedMotionTime=0;
let verticalSpeed=0,jumpBuffer=0;const fixed=FIXED_STEP;const velocity=new THREE.Vector3();
function physicsStep(){
  for(const d of doors){const occupied=Math.abs(player.translation().x-d.x)<.9&&Math.abs(player.translation().z-6)<2.4;if(!d.open&&occupied)d.open=true;d.progress=THREE.MathUtils.damp(d.progress,d.open?1:0,5,fixed);d.mesh.position.y=1.6+d.progress*3.7;d.collider?.setTranslation({x:d.x,y:d.mesh.position.y,z:6});}
  const input=new THREE.Vector2((keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+touchMove.x,(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)+touchMove.y);if(input.length()>1)input.normalize();
  const speed=keys.has('ShiftLeft')||keys.has('ShiftRight')?5:3;const desired=new THREE.Vector3(input.x,0,input.y).applyAxisAngle(new THREE.Vector3(0,1,0),yaw).multiplyScalar(speed);velocity.lerp(desired,1-Math.exp(-12*fixed));
  const grounded=controller.computedGrounded(),jump=stepJumpBuffer(jumpBuffer,grounded);jumpBuffer=jump.remaining;
  if(grounded)verticalSpeed=jump.jump?4.2:-.2;else verticalSpeed-=9.81*fixed;
  controller.computeColliderMovement(playerCollider,{x:velocity.x*fixed,y:verticalSpeed*fixed,z:velocity.z*fixed});const m=controller.computedMovement(),p=player.translation();player.setNextKinematicTranslation({x:p.x+m.x,y:p.y+m.y,z:p.z+m.z});if(!onSurface)stepCrew();world.step();if(!onSurface)syncCrew();
  if(player.translation().y< -4){const spawn=onSurface?{x:SURFACE_ORIGIN,y:1.05,z:LANDING.z}:{x:0,y:.9,z:16};player.setTranslation(spawn,true);player.setNextKinematicTranslation(spawn);clearInput();verticalSpeed=0;}
}
const clock=new THREE.Clock();let frames=0,fpsTime=0;
function frame(){requestAnimationFrame(frame);const rawDt=clock.getDelta(),dt=Math.min(rawDt,MAX_FRAME_SECONDS);elapsed+=dt;toastTimer-=Math.min(rawDt,1);
  const movementDt=discardMovementFrame?0:rawDt,powerDt=skipPowerFrame?0:rawDt;discardMovementFrame=false;skipPowerFrame=false;lastMotionSteps=0;if(toastTimer<=0)$('toast').style.opacity='0';
  if(active)advancePower(Math.min(powerDt,MAX_FRAME_SECONDS));powerVisuals();
  navigationTimer+=rawDt;if(navigationTimer>=.1){paintNavigation();navigationTimer=0;}
  if(active&&!dialogueOpen){const budget=motionClock.advance(movementDt);lastMotionSteps=budget.steps;motionStepsTotal+=budget.steps;droppedMotionTime+=budget.dropped;for(let i=0;i<budget.steps;i++)physicsStep();const p=player.translation();const moving=velocity.length();camera.position.set(p.x,p.y+.74+Math.sin(elapsed*9)*.018*Math.min(moving,1),p.z);camera.rotation.set(pitch,yaw,0);$('location').textContent=onSurface?'NYSA / SURVEY SITE':p.x< -11?'ENGINEERING':p.x>11?'OBSERVATORY':p.z< -5?'COMMAND DECK':'HABITAT CONCOURSE';$('coordinates').textContent=`${onSurface?'SURFACE':'SECTOR 00.00'} / X ${(p.x-(onSurface?SURFACE_ORIGIN:0)).toFixed(1)} · Z ${p.z.toFixed(1)}`;
    nearest=selectTarget();$('interaction').style.display=nearest?'block':'none';$('interaction').textContent=nearest?`[ E ] ${nearest.name}`:'';
  }else{$('interaction').style.display='none';}
  for(let i=0;i<rings.length;i++){rings[i].rotation.z+=dt*.035*(i%2?-1:1);rings[i].rotation.y+=dt*.012;}pylons.rotation.z=elapsed*.018;shell.rotation.y=elapsed*.06;forgeBody.rotation.y=elapsed*.03;forgeLight.scale.setScalar(.96+Math.sin(elapsed*1.4)*.04+(progress.forged?.12:0));chart.rotation.y=elapsed*.15;reactorCore.rotation.y=elapsed*.25;planet.rotation.y=elapsed*.008;
  if(dialogueOpen&&speakingCrew){const c=crew.find(c=>c.name===speakingCrew)!;const p=player.translation();c.mesh.rotation.y=turnToward(c.mesh.rotation.y,Math.atan2(p.x-c.mesh.position.x,p.z-c.mesh.position.z),dt);}
  lightBudget.configure($<HTMLSelectElement>('quality').value==='high',!onSurface);lightBudget.update(camera.position,dt);
  if(bloom.enabled)composer.render();else renderer.render(scene,camera);frames++;fpsTime+=rawDt;if(fpsTime>2){canvas.dataset.fps=String(Math.round(frames/fpsTime));frames=0;fpsTime=0;}
}
async function boot(){await RAPIER.init();world=new RAPIER.World({x:0,y:-9.81,z:0});world.timestep=fixed;
  world.createCollider(RAPIER.ColliderDesc.trimesh(surface.mesh.vertices,surface.mesh.indices).setTranslation(SURFACE_ORIGIN,0,0));
  for(const axis of ['x','z'])for(const sign of [-1,1])world.createCollider(RAPIER.ColliderDesc.cuboid(axis==='x'?1:SITE_HALF+1,4,axis==='z'?1:SITE_HALF+1).setTranslation(SURFACE_ORIGIN+(axis==='x'?sign*(SITE_HALF+1):0),2,axis==='z'?sign*(SITE_HALF+1):0));
  extractionTarget.collider=world.createCollider(RAPIER.ColliderDesc.cuboid(.16,1.2,.16).setTranslation(SURFACE_ORIGIN,1.2,LANDING.z+2.4));
  sampleTarget.collider=world.createCollider(RAPIER.ColliderDesc.ball(.6).setTranslation(SURFACE_ORIGIN+SAMPLE.x,terrainHeight(SAMPLE.x,SAMPLE.z)+.45,SAMPLE.z));
  for(const rock of surface.obstacles)world.createCollider(RAPIER.ColliderDesc.ball(rock.radius).setTranslation(rock.x,rock.y,rock.z));
  for(const s of solids){const collider=world.createCollider(RAPIER.ColliderDesc.cuboid(s.size[0]/2,s.size[1]/2,s.size[2]/2).setTranslation(s.pos[0],s.pos[1],s.pos[2]));if(s.target)s.target.collider=collider;}for(const d of doors)d.collider=world.createCollider(RAPIER.ColliderDesc.cuboid(.14,1.6,1.95).setTranslation(d.x,1.6,6));player=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,.9,16));playerCollider=world.createCollider(RAPIER.ColliderDesc.capsule(.55,.3),player);controller=world.createCharacterController(.015);controller.enableAutostep(.25,.2,true);controller.enableSnapToGround(.2);controller.setMaxSlopeClimbAngle(Math.PI/4);
  for(const c of crew){
    c.body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(c.mesh.position.x,.94,c.mesh.position.z));
    c.collider=world.createCollider(RAPIER.ColliderDesc.capsule(.67,.24),c.body);c.target.collider=c.collider;
    c.controller=world.createCharacterController(.015);c.controller.enableSnapToGround(.2);c.controller.enableAutostep(.25,.2,true);
  }
  world.step(); // Populate collision queries before the first interaction/sight sample.
  syncCrew();updateHud();paintPower();$('loading').textContent='Systems ready · progress saves on this device';$('play').removeAttribute('disabled');canvas.dataset.ready='true';frame();}
if(matchMedia('(pointer:coarse)').matches || new URLSearchParams(location.search).has('qa')){$<HTMLSelectElement>('quality').value='low';renderer.setPixelRatio(1);renderer.shadowMap.enabled=false;bloom.enabled=false;surface.setQuality(false);resize();}
$('play').setAttribute('disabled','');boot().catch(()=>{$('loading').textContent='Physics initialization failed. Refresh to retry.';});
// Explicit development-only observability; stripped from the static production build.
if(import.meta.env.DEV && new URLSearchParams(location.search).has('qa')){
  Object.assign(window,{__erebus:{snapshot:()=>({position:player?.translation(),onSurface,progress,surfaceMaterials:surface.materialSnapshot(),timing:{lastMotionSteps,motionStepsTotal,droppedMotionTime},render:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,batching,lighting:lightBudget.snapshot()},doors:doors.map(d=>({open:d.open,height:d.mesh.position.y})),active,dialogueOpen,nearest:nearest?.name,crew:crew.map(c=>({name:c.name,position:c.body?.translation(),mode:c.state.mode,visitorVisible:c.visitorVisible,duty:c.duty?(c.duty.phase==='watch'?'containment-watch':'returning-to-patrol'):'patrol',dutyPath:c.duty?.path,dutyCursor:c.duty?.cursor,gait:c.gait,walkBlend:c.walkBlend,yaw:c.mesh.rotation.y})),touchMove:{x:touchMove.x,y:touchMove.y},reactorColor:reactorMaterial.emissive.getHex(),habitatLight:ceilingSpot.intensity}),place:(x:number,z:number,angle=0)=>{player.setTranslation({x,y:onSurface?terrainHeight(x-SURFACE_ORIGIN,z)+1.05:.9,z},true);yaw=angle;pitch=-.12;velocity.set(0,0,0);verticalSpeed=0;},target:(name:string)=>{const t=targets.find(t=>t.name===name);if(!t)throw new Error('Unknown test target');const z=t.position.z+1.65;player.setTranslation({x:t.position.x,y:onSurface?terrainHeight(t.position.x-SURFACE_ORIGIN,z)+1.05:.9,z},true);yaw=0;pitch=-.3;velocity.set(0,0,0);}}});
}
