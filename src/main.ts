import {RoverSalvageScene} from './rover-salvage-scene';
import {SALVAGE_ARCHIVE,salvageBlock} from './rover-salvage';
import {SignalVaultScene} from './signal-vault-scene';
import {VAULT_ARCHIVE,carrierReading,calibrateVault,recoverVault} from './signal-vault';
import './style.css';
import {createRockCollider} from './rock-collider';
import {startFlight,startRunwayFlight,stepFlight,beginApproach,canApproach,flightDistance,flightSpeed,flightGoal,isSurfaceFlight,surfaceFlightPose,cloudOpacity,approachGuidance,captureLook,DOCKING_SECONDS,NYSA_CENTER,NYSA_RADIUS,type FlightState,type FlightLeg} from './flight';
import {inDockingZone} from './station';
import {createFlightScene,makeShuttle} from './flight-scene';
import {createPlanetTextures} from './planet';
import {SharedSpace,FORGE_CENTER,SPACE_COLOR} from './shared-space';
import {RelayOutpost} from './relay-outpost';
import {SurveyDrone,droneScanSite} from './survey-drone';
import {OrbitalProbe} from './orbital-probe';
import {OrbitalScan,SIGNAL_ARCHIVE,SIGNAL_RANGE,SIGNAL_SPEED,signalBlock,signalDistance} from './orbital-signal';
import {WAYFINDER} from './orbital-layout';
import {GameAudio} from './game-audio';
import {VesperSurface} from './vesper-surface';
import {VESPER,VESPER_RADIUS,VESPER_APPROACH,vesperBlock,VESPER_ARCHIVE,VESPER_SITES} from './vesper';
import {createVesperGlobe} from './vesper-globe';
import {FootstepPace,type FootSurface} from './soundscape';
import {biomeAt} from './biomes';
import {PLAYER_MOTION_STRIDES,CREW_MOTION_STRIDES} from './locomotion-strides';
import {REPAIR_SITES,OUTPOST,repairRelay,activateUplink,uplinkBlock} from './relay-expedition';
import {loadCrewVisuals,loadPlayerVisual,type CrewVisual} from './crew-visual';
import {loadAuthoredAsset} from './authored-assets';
import {FlightFeedback} from './flight-feedback';
import {createThrusters} from './thrusters';
import {createWindowVista,clearCabinGlazing} from './window-vista';
import {PLAYER_SHAPE} from './player-shape';
import {SHIP_LAYOUT} from './ship-layout';
import {meshColliders} from './mesh-colliders';
import {attachRequested} from './requested-assets';
import {TurboFeedback} from './turbo-feedback';
import {VehicleSuspension} from './vehicle-suspension';
import {BIKE_RIDER_SEAT} from './rider-contact';
import {BIKE_EYE,bikeViewFov} from './bike-view';
import {LaunchBay,LAUNCH_BAY} from './launch-bay';
import {createRunwayShell,runwayShellColliders} from './runway-shell';
import {VehicleStance,terrainSampler} from './vehicle-stance';
import {GroundVehicle,VEHICLE_SPEC,dismountPosition,type VehicleKind} from './ground-vehicle';
import {steerPilot,targetThrottle,WALK_SPEED,RUN_SPEED,JUMP_SPEED} from './pilot-controls';
import {crewBriefing,type BriefingTopic} from './crew-briefing';
import {startTour,continueTour,cancelTour,planTour,recordTourMovement,tourLine,type TourState} from './crew-tour';
import {drawSurveyMap,mapPoint,surfacePin,PIN_LIMIT} from './survey-map';
import type {SurfaceTrack} from './navigation';
import {walkingCamera,flightCamera,orbitalCameraDistance,surfaceCameraDistance} from './view-camera';
import {SHUTTLE_SIZE,SHUTTLE_HATCH_Z,SHUTTLE_EYE_HEIGHT} from './shuttle';
import {coolantBlock,dischargeCoolant,recoverSupplies,SUPPLY_CACHE} from './supplies';
import {cachePlacement,CACHE_SIZE} from './cache-placement';
import {SupplyCartridges,CARTRIDGE_LAYOUT} from './supply-cartridges';
import {bulkheadPanels} from './bulkheads';
import {clearSight} from './visibility';
import {INTREPID_ENGINEERING_GRAPH,planEngineeringDuty,recordDutyMovement,type EngineeringDuty} from './crew-duty';
import {ShipLightBudget} from './light-budget';
import {batchStaticBoxes} from './batching';
import {FixedFrameClock,FIXED_STEP,MAX_FRAME_SECONDS,JUMP_BUFFER_SECONDS,stepJumpBuffer} from './timing';
import {missionDestination,routeWaypoint,navigationReading} from './navigation';
import {createSurface} from './surface';
import {FIELD_SITES,type FieldScan} from './survey';
import {LANDING,SAMPLE,SITE_HALF,SURFACE_ORIGIN,terrainHeight,landingBlock,landingPad,nextLandingSite,type LandingSite} from './excursion';
import {forgeReadiness,powerOutput,resetContainment,stepPower,type PowerProfile} from './power';
import {freshPatrol, planPatrol, recordPatrolMovement, turnToward, type PatrolState, type Point} from './patrol';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { activateForge, activateRelay, freshProgress, parseProgress, recordFieldScan, RELAYS, SAVE_KEY, LEGACY_SAVE_KEY, type Relay } from './state';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('universe');
let informationVisible=false,thirdPerson=false;
try{informationVisible=localStorage.getItem('erebus-information')==='visible';thirdPerson=localStorage.getItem('erebus-camera')==='third';}catch{/* Optional preferences. */}
const viewControls=document.createElement('nav');viewControls.id='viewControls';viewControls.setAttribute('aria-label','View controls');
viewControls.innerHTML='<button id="infoToggle" aria-label="Show information panels" aria-keyshortcuts="H">INFO</button><button id="cameraToggle" aria-label="Switch to third person" aria-keyshortcuts="C">1P</button>';
$('hud').append(viewControls);viewControls.append($('menu'));
function paintViewPreferences(){
  $('hud').dataset.information=String(informationVisible);$('hud').dataset.camera=thirdPerson?'third':'first';
  $('infoToggle').setAttribute('aria-pressed',String(informationVisible));$('infoToggle').setAttribute('aria-label',`${informationVisible?'Hide':'Show'} information panels`);
  $('cameraToggle').setAttribute('aria-pressed',String(thirdPerson));$('cameraToggle').setAttribute('aria-label',`Switch to ${thirdPerson?'first':'third'} person`);$('cameraToggle').textContent=thirdPerson?'3P':'1P';
}
$('infoToggle').onclick=()=>{informationVisible=!informationVisible;try{localStorage.setItem('erebus-information',informationVisible?'visible':'hidden');}catch{}paintViewPreferences();};
$('cameraToggle').onclick=()=>{thirdPerson=!thirdPerson;try{localStorage.setItem('erebus-camera',thirdPerson?'third':'first');}catch{}paintViewPreferences();};
paintViewPreferences();
let progress = freshProgress();
try { progress = parseProgress(localStorage.getItem(SAVE_KEY)??localStorage.getItem(LEGACY_SAVE_KEY)); } catch { /* storage is optional */ }
let active=false, dialogueOpen=false, yaw=0, pitch=-.04, elapsed=0, toastTimer=0;
const keys=new Set<string>(), touchMove=new THREE.Vector2();
let renderer: THREE.WebGLRenderer;
try { renderer = new THREE.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance'}); }
catch { $('loading').textContent='This expedition needs WebGL 2. Try a browser with hardware acceleration enabled.'; $('play').setAttribute('disabled',''); throw new Error('WebGL unavailable'); }
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
renderer.setSize(innerWidth,innerHeight,false); renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.1;
const scene=new THREE.Scene(); scene.background=new THREE.Color(SPACE_COLOR);
const camera=new THREE.PerspectiveCamera(68,innerWidth/innerHeight,.08,2500); camera.rotation.order='YXZ';
camera.position.set(0,1.7,16);
const composer=new EffectComposer(renderer);const renderPass=new RenderPass(scene,camera); composer.addPass(renderPass);
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
const deck=new THREE.Group();scene.add(deck);
const deckFallback=new THREE.Group();deck.add(deckFallback);
function deckBox(w:number,h:number,d:number,x:number,y:number,z:number,mat:THREE.Material=floorMat){return box(w,h,d,x,y,z,mat,deckFallback);}
deckBox(4.2,.2,25.675,0,-.1,-6.0125);deckBox(4.2,.2,25.675,0,4.6,-6.0125,dark);
for(const side of [-1,1]){
 deckBox(4.2,.2,4.725,side*5.25,-.1,-6.0375);deckBox(1.1,.2,2.3,side*2.625,-.1,-6.0375);
 deckBox(.2,4.5,11.85,side*2.2,2.25,-12.925,wallMat);deckBox(.2,4.5,11.875,side*2.2,2.25,.8875,wallMat);
 deckBox(.2,4.5,4.725,side*7.45,2.25,-6.0375,wallMat);
 for(const z of [-8.5,-3.575])deckBox(4.3,4.5,.2,side*5.25,2.25,z,wallMat);
}
for(const x of [-1.9,1.9])deckBox(.4,4.5,.2,x,2.25,-18.95,wallMat);deckBox(3.4,1.1,.2,0,3.95,-18.95,wallMat);
const runway=new THREE.Group();runway.position.z=LAUNCH_BAY.centerZ;scene.add(runway);
const runwayReady=attachRequested('corridor',runway).catch(()=>{console.warn('Runway asset unavailable; sealed structural fallback retained');return undefined;});
const windowVista=createWindowVista();windowVista.position.z=-24;scene.add(windowVista);
const cabin=new THREE.Group();cabin.position.z=LAUNCH_BAY.cabinZ;scene.add(cabin);
let cabinLoaded=false;
scene.add(createRunwayShell());
point(0x79c9ed,24,0,4,-12,12);point(0x79c9ed,24,0,4,0,12);
point(0xd2e5f0,65,0,4,LAUNCH_BAY.centerZ,25);point(0xffd5aa,50,0,3.5,11,11);
point(0xffa763,38,-5.25,4,-6,10);point(0x79ddff,38,5.25,4,-6,10);
const ceilingSpot=new THREE.SpotLight(0xc7eaff,60,25,Math.PI/3,.6,1.4);ceilingSpot.position.set(0,4,-4);ceilingSpot.target.position.set(0,0,-12);ceilingSpot.castShadow=true;ceilingSpot.shadow.mapSize.set(1024,1024);scene.add(ceilingSpot,ceilingSpot.target);
// A single sector-space forge persists across station and orbital rendering.
const forge=new THREE.Group();forge.position.set(...FORGE_CENTER);forge.scale.setScalar(4);scene.add(forge);
const forgeBody=new THREE.Mesh(new THREE.TorusGeometry(7.8,.85,12,96),metal);forge.add(forgeBody);
const forgeLight=sphere(4.8,0,0,0,new THREE.MeshBasicMaterial({color:0xb3efff}),forge);
const rings:THREE.Mesh[]=[];
for(let i=0;i<5;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(12+i*3.2,.18+(i%2)*.35,8,128),i%2?metal:cyan);ring.rotation.set(i*.57,i*.68,i*.4);forge.add(ring);rings.push(ring);}
const pylons=new THREE.Group();forge.add(pylons);
for(let i=0;i<12;i++){const a=i*Math.PI/6;const p=new THREE.Group();p.position.set(Math.cos(a)*21,Math.sin(a)*21,0);p.rotation.z=a;box(8,1.1,2,0,0,0,metal,p);box(5,.08,2.08,0,.6,0,cyan,p);box(2,3,3,3,0,0,dark,p);pylons.add(p);}
const shell=new THREE.Mesh(new THREE.IcosahedronGeometry(9,1),new THREE.MeshBasicMaterial({color:0x70cbd4,wireframe:true,transparent:true,opacity:.22}));forge.add(shell);
const halo=new THREE.Mesh(new THREE.TorusGeometry(31,.12,8,160),amber);halo.rotation.x=.7;forge.add(halo);
const starsGeo=new THREE.BufferGeometry();const stars=new Float32Array(3500*3);for(let i=0;i<3500;i++){const a=random()*Math.PI*2,b=Math.acos(2*random()-1),r=800+random()*700;stars.set([Math.sin(b)*Math.cos(a)*r,Math.cos(b)*r,Math.sin(b)*Math.sin(a)*r],i*3);}starsGeo.setAttribute('position',new THREE.BufferAttribute(stars,3));const starfield=new THREE.Points(starsGeo,new THREE.PointsMaterial({color:0xb8d4e8,size:1.2,sizeAttenuation:true}));
const planetMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.9,metalness:.05});
const planetTextures=createPlanetTextures();planetMat.map=planetTextures.color;
const planet=new THREE.Mesh(new THREE.SphereGeometry(NYSA_RADIUS,64,40),planetMat);planet.position.copy(NYSA_CENTER);const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(NYSA_RADIUS+5,48,32),new THREE.MeshBasicMaterial({color:0x67b7e9,transparent:true,opacity:.15,side:THREE.BackSide}));atmosphere.position.copy(NYSA_CENTER);planet.visible=atmosphere.visible=progress.forged;
const clouds=new THREE.Mesh(new THREE.SphereGeometry(NYSA_RADIUS+2,48,32),new THREE.MeshStandardMaterial({map:planetTextures.clouds,transparent:true,opacity:.8,roughness:1,depthWrite:false}));clouds.position.copy(NYSA_CENTER);clouds.visible=progress.forged;
const companion=sphere(65,-350,90,-850,new THREE.MeshStandardMaterial({color:0x806b78,roughness:1}));
const vesperGlobe=createVesperGlobe();const sharedSpace=new SharedSpace(starfield,forge,planet,atmosphere,clouds,companion,vesperGlobe);scene.add(sharedSpace.root);
const flightWorld=createFlightScene(camera);
const orbitalProbe=new OrbitalProbe();flightWorld.scene.add(orbitalProbe.root);orbitalProbe.setRecovered(progress.signalRecovered);
// Reactor with nested containment chambers.
const reactor=new THREE.Group();reactor.position.set(-10,1.8,-6);scene.add(reactor);
const reactorMaterial=cyan.clone();
const reactorCore=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,3,32),reactorMaterial);reactor.add(reactorCore);
for(const y of [-1.4,1.4]){const rim=new THREE.Mesh(new THREE.TorusGeometry(1.35,.16,8,48),metal);rim.rotation.x=Math.PI/2;rim.position.y=y;reactor.add(rim);}
for(let i=0;i<6;i++){const a=i*Math.PI/3;box(.15,3.4,.15,Math.cos(a)*1.3,0,Math.sin(a)*1.3,metal,reactor);}const reactorLight=point(0x67cfe6,18,-10,1.8,-6,8);
// Star chart projection in the observatory.
const chart=new THREE.Group();chart.position.set(10,1.5,-6);scene.add(chart);
for(let i=0;i<3;i++){const r=new THREE.Mesh(new THREE.TorusGeometry(.6+i*.45,.018,6,64),cyan);r.rotation.x=Math.PI/2+i*.1;chart.add(r);}sphere(.2,0,0,0,amber,chart);
box(3,1.2,.15,5.25,2.7,-8.4,textPanel('OBSERVATORY','SPECTRAL ARRAY / ONLINE'));
box(3,1.2,.15,-5.25,2.7,-8.4,textPanel('ENGINEERING','CONTAINMENT / NOMINAL','#edb378'));

const solids:{size:number[];pos:number[];target?:Target}[]=[];
function solid(w:number,h:number,d:number,x:number,y:number,z:number,target?:Target){solids.push({size:[w,h,d],pos:[x,y,z],target});}
let onSurface=false;
let trackedField:SurfaceTrack|undefined;
let landingSite:LandingSite='survey';
let flight:FlightState|null=null,flightBrake=false,flightBoost=false;
let trackedSignal=false,trackedVesper=false;let vesperTrip:VesperSurface|null=null,vesperWorld:VesperSurface|undefined;const orbitalScan=new OrbitalScan();
let captureViewStart={yaw:0,pitch:0};
let pilot={yaw:0,pitch:0},speedDemand=0;
let riding:GroundVehicle|null=null;const groundVehicles=new Map<VehicleKind,GroundVehicle>();const vehicleVisuals=new Map<VehicleKind,THREE.Group>();const vehicleTargets=new Map<VehicleKind,Target>();
type Target={zone?:'surface';name:string;position:THREE.Vector3;action:()=>void;screen?:THREE.Mesh;collider?:RAPIER.Collider;};
const targets:Target[]=[];
function terminal(name:string,x:number,z:number,title:string,subtitle:string,action:()=>void,screenMaterial?:THREE.Material){
 const w=screenMaterial?.6:1.8,d=screenMaterial?.3:1;
 box(w,.9,d,x,.5,z,dark);const screen=box(w*.89,.07,d*.9,x,1.04,z,screenMaterial??textPanel(title,subtitle));screen.rotation.x=.26;
 box(.06,.65,.06,x-w*.42,1.37,z-d*.4,cyan);const t={name,position:new THREE.Vector3(x,1.1,z),action,screen};targets.push(t);solid(w,1.1,d,x,.55,z,t);return t;
}
function notify(message:string){$('toast').textContent=message;$('toast').style.opacity='1';toastTimer=5;}
let storageWarned=false;
function save(refresh=true){try{localStorage.setItem(SAVE_KEY,JSON.stringify(progress));}catch{if(!storageWarned){notify('Storage unavailable. Progress will last for this session.');storageWarned=true;}}if(refresh){updateHud();if(player)paintNavigation();}}
function relayAction(r:Relay){if(progress.relays.includes(r)){notify(`${r.toUpperCase()} relay already online.`);return;}progress=activateRelay(progress,r);save();notify(`${r.toUpperCase()} relay online · ${progress.relays.length}/3 synchronized`);tone(330+progress.relays.length*110);}
const relayTargets=[terminal('Restore engineering relay',-5,-5.7,'POWER RELAY','01 / ENGINEERING',()=>relayAction('engineering')),terminal('Restore navigation relay',0,-13.5,'NAVIGATION','02 / BRIDGE ARRAY',()=>relayAction('navigation')),terminal('Restore observatory relay',5,-5.7,'SPECTRAL ARRAY','03 / OBSERVATORY',()=>relayAction('observatory'))];
terminal('Initialize universe forge',0,-17.2,'THE ARCHITECT','GENESIS CONTROL',()=>{if(progress.forged){notify('Genesis complete. Your new world is visible ahead of the launch runway.');return;}if(progress.relays.length<3){notify(`Genesis locked. Restore ${3-progress.relays.length} remaining power relay(s).`);tone(120);return;}const blocked=forgeReadiness(progress.power,progress.relays.length);if(blocked){notify(blocked);tone(120);return;}progress=activateForge(progress);planet.visible=atmosphere.visible=true;save();notify('GENESIS COMPLETE · New world designated Nysa.');tone(660);});
terminal('Scan the new world',0,-10.5,'DEEP SCAN','TARGET / NYSA',()=>{
  showDialogue('EREBUS / SCIENCE ARRAY',progress.forged?'NYSA · Survey corridor charted. Launch the survey shuttle, pilot toward the marked approach ring, brake below 18 m/s and press E to land. Collect an outcrop sample, then board your shuttle and fly back to Erebus.':'No terrestrial signatures. Initialize the architect to create Nysa.');
  $('expeditionPanel').hidden=!progress.forged;
  $<HTMLButtonElement>('deployNysa').disabled=landingBlock(progress.forged,progress.power.tripped)!==null;
});
terminal('Open engineering diagnostics',-6.2,-7.4,'CONTAINMENT','POWER ROUTING',showPower);
terminal('Launch survey shuttle',0,4.4,'SHUTTLE BAY','KESTREL / FLIGHT CONTROL',()=>boardParkedJet());
for(const [x,z]of [[2.8,-17.8],[-2.8,-20.2]])terminal('Runway inner door '+(z>-19?'station':'bay'),x,z,'AIRLOCK','RUNWAY ACCESS',()=>requestRunwayAccess(),textPanel('ACCESS','INNER DOOR'));
let world:RAPIER.World, player:RAPIER.RigidBody, playerCollider:RAPIER.Collider, controller:RAPIER.KinematicCharacterController,surfaceTerrainCollider:RAPIER.Collider;
let parkedShuttleCollider:RAPIER.Collider;
const structuralColliders:RAPIER.Collider[]=[];
const structureStart=solids.length;
solid(4.2,.2,25.675,0,-.1,-6.0125);
for(const side of [-1,1]){
 solid(4.2,.2,4.725,side*5.25,-.1,-6.0375);solid(1.1,.2,2.3,side*2.625,-.1,-6.0375);
 solid(.2,4.5,11.85,side*2.2,2.25,-12.925);solid(.2,4.5,11.875,side*2.2,2.25,.8875);
 solid(.2,4.5,4.725,side*7.45,2.25,-6.0375);
 for(const z of [-8.5,-3.575])solid(4.3,4.5,.2,side*5.25,2.25,z);
}
for(const x of [-1.9,1.9])solid(.4,4.5,.2,x,2.25,-18.95);solid(3.4,1.1,.2,0,3.95,-18.95);
const structureEnd=solids.length;
// The bow opening is protected by the interlocked launch-bay inner door.
solid(2.2,.2,1,0,-.1,7.1);
const doors:{mesh:THREE.Mesh;open:boolean;collider?:RAPIER.Collider;progress:number;x:number}[]=[];
const accessScreen=textPanel('ACCESS','BULKHEAD CONTROL');
for(const x of [-SHIP_LAYOUT.doorX,SHIP_LAYOUT.doorX]){
  const mesh=box(.28,3.2,1.95,x,1.6,SHIP_LAYOUT.doorZ,dark);box(.3,.03,1.7,0,.6,0,cyan,mesh);
  const door={mesh,open:false,progress:0,x};doors.push(door);
  const toggle=()=>{door.open=!door.open;notify(`Bulkhead ${door.open?'opening':'closing'}`);tone(220);};
  for(const panel of bulkheadPanels(x,SHIP_LAYOUT.doorZ,SHIP_LAYOUT.panelOffsetZ))terminal(panel.name,panel.x,panel.z,'ACCESS','BULKHEAD CONTROL',toggle,accessScreen);
}
// Local Mixamo skinned crew load asynchronously; procedural androids remain a failure fallback.
interface CrewMember {
  name: string; mesh: THREE.Group; legs: THREE.Group[]; arms: THREE.Group[];
  target: Target; route: [Point, Point]; state: PatrolState; duty: EngineeringDuty|null; visitorVisible:boolean; sightWait:number; gait: number; walkBlend: number;
  visual?: CrewVisual; body?: RAPIER.RigidBody; collider?: RAPIER.Collider; controller?: RAPIER.KinematicCharacterController;
}
const crew: CrewMember[] = [];
let crewTour:TourState|null=null;
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
    if(name==='VEGA'&&crewTour)openTourBriefing();else openCrewBriefing(name,'mission');
  }};
  targets.push(target);
  const route:[Point,Point]=name==='VEGA'?[{x,z:z-1},{x,z:z+1.5}]:[{x,z},{x:x+1.5,z:z+1.5}];
  crew.push({name,mesh:g,legs,arms,target,route,state:freshPatrol(),duty:null,visitorVisible:false,sightWait:0,gait:0,walkBlend:0});
}
makeCrew('VEGA',.7,-9,0x294b62);makeCrew('ION',-4.4,-6.7,0x88684d);
const avatar=new THREE.Group();avatar.name='player-avatar';
avatar.rotation.y=Math.PI;
// A small articulated fallback stays playable while the shared Mixamo skin loads.
box(.48,.68,.3,0,1.15,0,wallMat,avatar);sphere(.17,0,1.72,0,wallMat,avatar);
const avatarLegs=[-1,1].map(side=>box(.17,.78,.18,side*.14,.43,0,dark,avatar));
let avatarVisual:CrewVisual|undefined,avatarGait=0,avatarBlend=0,cameraClearance=0;
void loadCrewVisuals([...crew.map(c=>c.mesh),avatar]).then(visuals=>{crew.forEach((c,i)=>c.visual=visuals[i]);avatarVisual=visuals[crew.length];void loadPlayerVisual(avatar).then(v=>avatarVisual=v).catch(()=>console.warn('Player model unavailable; existing character retained.'));}).catch(()=>console.warn('Crew asset unavailable; procedural fallback active.'));
function stepCrew(){
  const visitor=player.translation();
  for(const c of crew){
    const body=c.body!, collider=c.collider!, controller=c.controller!;
    const p=body.translation();
    c.sightWait-=fixed;
    if(Math.hypot(visitor.x-p.x,visitor.z-p.z)>2.3){c.visitorVisible=false;c.sightWait=0;}
    else if(c.sightWait<=0){c.visitorVisible=clearSight(world,{x:p.x,y:p.y+.8,z:p.z},{x:visitor.x,y:visitor.y+.74,z:visitor.z},collider,playerCollider);c.sightWait=.1;}
    const tourPlan=c.name==='VEGA'&&crewTour?planTour(crewTour,c.state,p,visitor,fixed,speakingCrew===c.name):null;
    if(tourPlan){const ended=!!crewTour&&!tourPlan.tour;crewTour=tourPlan.tour;if(ended)notify('VEGA / Bridge patrol resumed.');}
    const plan=tourPlan?{duty:null,...tourPlan}:c.name==='ION'?planEngineeringDuty(c.duty,c.state,p,c.route,visitor,fixed,progress.power.tripped,speakingCrew===c.name,c.visitorVisible,INTREPID_ENGINEERING_GRAPH,SHIP_LAYOUT.diagnostics):{duty:null,...planPatrol(c.state,p,c.route,visitor,fixed,speakingCrew===c.name,c.visitorVisible)};
    if(tourPlan&&crewTour)for(const door of doors)if(Math.hypot(p.x-door.x,p.z-SHIP_LAYOUT.doorZ)<1.5)door.open=true;
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
    if(tourPlan){if(crewTour)crewTour=recordTourMovement(crewTour,intended,forwardProgress,fixed);c.state=plan.state;}
    else if(c.duty){c.duty=recordDutyMovement(c.duty,intended,forwardProgress,fixed,p,INTREPID_ENGINEERING_GRAPH);c.state=plan.state;}
    else c.state=recordPatrolMovement(plan.state,intended,forwardProgress,fixed);
    body.setNextKinematicTranslation({x:p.x+move.x,y:p.y+move.y,z:p.z+move.z});
    c.gait+=distance/.85*Math.PI*2;
    c.walkBlend=THREE.MathUtils.damp(c.walkBlend,Math.min(1,distance/(.65*fixed)),12,fixed);
    c.visual?.update(fixed,distance,c.walkBlend);
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
function updateHud(){const spans=$('relays').children;RELAYS.forEach((r,i)=>spans[i].classList.toggle('done',progress.relays.includes(r)));$('system').textContent=progress.forged?'GENESIS STABLE':`POWER RELAYS ${progress.relays.length}/3`;$('objective').textContent=progress.forged?'A universe begins':progress.relays.length===3?'Initialize the architect':'Awaken the architect';$('missionText').textContent=progress.forged?(progress.surveyed?'Nysa sample secured. Launch Kestrel for another survey flight.':'Scan Nysa, launch Kestrel and land at the survey site.'):progress.relays.length===3?'All relays synchronized. Use the central architect terminal at the forward window.':'Restore three power relays, then initialize the universe forge from the bridge.';if(onSurface){$('objective').textContent=progress.surveyed?'Return to Erebus':'Survey the luminous outcrop';$('missionText').textContent=progress.surveyed?'Sample secured. Board Kestrel at the landing pad, then fly back to Erebus.':'Walk toward the luminous outcrop northeast of the landing pad. Interact with E to secure a sample.';}relayTargets.forEach((t,i)=>{const relay:Relay[]=['engineering','navigation','observatory'];if(t.screen&&t.screen.userData.online!==progress.relays.includes(relay[i])){const old=t.screen.material as THREE.MeshBasicMaterial;old.map?.dispose();old.dispose();t.screen.userData.online=progress.relays.includes(relay[i]);t.screen.material=textPanel(relay[i].toUpperCase(),progress.relays.includes(relay[i])?'RELAY / ONLINE':'RELAY / STANDBY',progress.relays.includes(relay[i])?'#83f0c1':'#79e4ed');}});}
let audioContext:AudioContext|undefined,gameAudio:GameAudio|undefined;const footstepPace=new FootstepPace();
$('audio').nextSibling!.textContent=' Game audio';
try{$<HTMLInputElement>('audio').checked=localStorage.getItem('erebus-audio')!=='muted';}catch{/* Optional preference. */}
function initAudio(){try{
  const enabled=$<HTMLInputElement>('audio').checked&&active;
  if(!enabled){gameAudio?.mute(true);void audioContext?.suspend().catch(()=>{});return;}
  audioContext??=new AudioContext();gameAudio??=new GameAudio(audioContext);gameAudio.mute(false);void audioContext.resume().catch(()=>{});
}catch{/* Unsupported audio remains silent and playable. */}}
function tone(frequency:number){if(active&&$<HTMLInputElement>('audio').checked)gameAudio?.cue(frequency);}
function footSurface():FootSurface{
  if(!onSurface)return 'metal';const p=player.translation(),hit=world.castRay(new RAPIER.Ray(p,{x:0,y:-1,z:0}),2,true,undefined,undefined,playerCollider);
  if(hit&&hit.collider.handle!==surfaceTerrainCollider.handle)return hit.collider.shape.type===RAPIER.ShapeType.ConvexPolyhedron?'stone':'metal';
  const biome=biomeAt(p.x-SURFACE_ORIGIN,p.z);return biome==='dunes'?'sand':biome==='wetland'?'wet':'stone';
}
const crewPanel=document.createElement('section');crewPanel.id='crewPanel';crewPanel.hidden=true;crewPanel.setAttribute('aria-label','Officer briefing topics');$('dialogue').insertBefore(crewPanel,$('closeDialogue'));
for(const [id,label] of [['mission','Next objective'],['survey','Survey debrief'],['systems','Ship systems']] as const){const button=document.createElement('button');button.dataset.briefing=id;button.textContent=label;button.onclick=()=>{if(active&&dialogueOpen&&!crewPanel.hidden&&speakingCrew)openCrewBriefing(speakingCrew,id);};crewPanel.append(button);}
const tourButton=document.createElement('button');tourButton.id='crewTour';tourButton.textContent='Guided station tour';crewPanel.append(tourButton);
const tourContinue=document.createElement('button');tourContinue.id='tourContinue';tourContinue.textContent='Continue tour';crewPanel.append(tourContinue);
const tourEnd=document.createElement('button');tourEnd.id='tourEnd';tourEnd.textContent='End tour / return to bridge';crewPanel.append(tourEnd);
function paintTourButtons(name:string){tourButton.hidden=name!=='VEGA'||!!crewTour;tourContinue.hidden=name!=='VEGA'||crewTour?.phase!=='stop';tourEnd.hidden=name!=='VEGA'||!crewTour||crewTour.phase==='return';}
tourButton.onclick=()=>{if(active&&dialogueOpen&&speakingCrew==='VEGA'&&!crewTour){crewTour=startTour();closeDialogue();notify('Follow Vega. Speak with her at each stop; she waits if you fall behind.');}};
tourContinue.onclick=()=>{if(active&&dialogueOpen&&speakingCrew==='VEGA'&&crewTour?.phase==='stop'){crewTour=continueTour(crewTour);closeDialogue();}};
tourEnd.onclick=()=>{if(active&&dialogueOpen&&speakingCrew==='VEGA'&&crewTour){crewTour=cancelTour(crewTour);closeDialogue();notify('Vega is returning to bridge patrol along the tour route.');}};
function openTourBriefing(){if(!crewTour)return;speakingCrew='VEGA';showDialogue('VEGA / STATION TOUR',tourLine(crewTour,progress));crewPanel.hidden=false;paintTourButtons('VEGA');for(const b of Array.from(crewPanel.querySelectorAll('[data-briefing]')))b.setAttribute('aria-pressed','false');}
function openCrewBriefing(name:string,topic:BriefingTopic){speakingCrew=name;showDialogue(`OFFICER ${name}`,crewBriefing(name,progress,topic));crewPanel.hidden=false;paintTourButtons(name);for(const b of Array.from(crewPanel.querySelectorAll<HTMLButtonElement>('[data-briefing]')))b.setAttribute('aria-pressed',String(b.dataset.briefing===topic));}
function showDialogue(name:string,line:string){$('crewPanel').hidden=true;$('powerPanel').hidden=true;$('expeditionPanel').hidden=true;$('surveyPanel').hidden=true;$('suppliesPanel').hidden=true;$('dronePanel').hidden=true;$('vaultPanel').hidden=true;dialogueOpen=true;clearInput();$('speaker').textContent=name;$('speech').textContent=line;$('dialogue').hidden=false;paintNavigation();document.exitPointerLock?.();}
function closeDialogue(){save(false);clearInput();$('powerPanel').hidden=true;$('expeditionPanel').hidden=true;$('suppliesPanel').hidden=true;$('crewPanel').hidden=true;dialogueOpen=false;speakingCrew=undefined;$('dialogue').hidden=true;paintNavigation();if(active&&!matchMedia('(pointer:coarse)').matches)void canvas.requestPointerLock()?.catch(()=>{});}
$('closeDialogue').onclick=closeDialogue;
function pause(){save(false);active=false;clearInput();powerAccumulator=0;paintNavigation();$('overlay').hidden=false;$('play').innerHTML='RESUME EXPEDITION <span>↗</span>';document.exitPointerLock?.();gameAudio?.mute(true);void audioContext?.suspend().catch(()=>{});}
$('menu').onclick=pause;
$('play').onclick=()=>{clearInput();skipPowerFrame=true;active=true;$('overlay').hidden=true;paintNavigation();initAudio();if(!matchMedia('(pointer:coarse)').matches)void canvas.requestPointerLock()?.catch(()=>notify('Click the scene to enable mouse look.'));};
canvas.onclick=()=>{if(active&&!dialogueOpen&&!matchMedia('(pointer:coarse)').matches)void canvas.requestPointerLock()?.catch(()=>{});};
$('audio').onchange=()=>{try{localStorage.setItem('erebus-audio',$<HTMLInputElement>('audio').checked?'enabled':'muted');}catch{}footstepPace.reset();initAudio();};
$('quality').onchange=()=>{const high=$<HTMLSelectElement>('quality').value==='high';renderer.setPixelRatio(Math.min(devicePixelRatio,high?1.75:1));renderer.shadowMap.enabled=high;bloom.enabled=high;surface.setQuality(high);lightBudget.configure(high,!onSurface&&!flight);resize();};
$('reset').onclick=()=>{if(onSurface||flight||launchBay.state.boarded){flight=null;flightWorld.hide();travel(false);}trackedSignal=false;orbitalScan.cancel();orbitalProbe.setRecovered(false);launchBay.state.reset();launchBay.sync();trackedField=undefined;landingSite='survey';progress=freshProgress();syncSalvage();signalVault.setState(progress.vault,true);vaultFrequency=15;vaultBearing=0;signalVault.tune(vaultFrequency,vaultBearing);surveyDrone.arrive(false,landingPad());surface.setScans([]);relayOutpost.setState(progress.network);surface.setRelayOnline(false);save();paintPower();planet.visible=atmosphere.visible=false;notify('Mission progress reset.');};
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
$('reset').addEventListener('click',()=>{if(crewTour)crewTour=cancelTour(crewTour);});
function paintPower(){
  reserveCartridges.setCount(progress.supplies.coolant);cacheCartridges.setCount(progress.supplies.cacheClaimed?0:2);
  reserveStatus.color.setHex(progress.supplies.coolant>0?0x77e5d4:0x627c88);cacheStatus.color.setHex(progress.supplies.cacheClaimed?0x627c88:0x77e5d4);
  if(!$('suppliesPanel').hidden)paintSupplies();
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
const suppliesPanel=document.createElement('section');suppliesPanel.id='suppliesPanel';suppliesPanel.hidden=true;suppliesPanel.setAttribute('aria-label','Reserve coolant');$('dialogue').insertBefore(suppliesPanel,$('closeDialogue'));
// Small generated fixtures remain as loading/failure fallbacks.
function equipment(kind:'canister'|'crate',x:number,y:number,z:number,parent:THREE.Object3D){const root=new THREE.Group();root.position.set(x,y,z);parent.add(root);const size=kind==='canister'?[1,1.6,1]:[CACHE_SIZE.width,CACHE_SIZE.height,CACHE_SIZE.depth];box(size[0],size[1],size[2],0,size[1]/2,0,metal,root);return root;}
const coolantReserve=new THREE.Group();coolantReserve.position.set(-6.3,0,-4.4);scene.add(coolantReserve);shipNodes.push(coolantReserve);
// Open rack stays within the old solid cabinet envelope.
const rackMaterial=new THREE.MeshStandardMaterial({color:0x54656b,metalness:.2,roughness:.78});
box(1,1.6,.08,0,.8,-.46,rackMaterial,coolantReserve);box(1,.12,1,0,.2,0,rackMaterial,coolantReserve);box(1,.12,1,0,1.54,0,rackMaterial,coolantReserve);
for(const x of [-.46,.46])box(.08,1.6,1,x,.8,0,rackMaterial,coolantReserve);
const reserveCartridges=new SupplyCartridges();reserveCartridges.root.position.y=CARTRIDGE_LAYOUT.rackY;reserveCartridges.root.scale.setScalar(CARTRIDGE_LAYOUT.rackScale);coolantReserve.add(reserveCartridges.root);
const reserveTarget:Target={name:'Open auxiliary coolant reserve',position:new THREE.Vector3(-6.3,1.1,-4.4),action:()=>openSupplies('discharge')};targets.push(reserveTarget);solid(1,1.6,1,-6.3,.8,-4.4,reserveTarget);
const cachePlan=cachePlacement(terrainSampler(surface.mesh.vertices)),cacheHeight=cachePlan.base,supplyCrate=equipment('crate',SUPPLY_CACHE.x,cacheHeight,SUPPLY_CACHE.z,surface.group);
const cacheFallback=[...supplyCrate.children];
box(CACHE_SIZE.width,cachePlan.palletHeight,CACHE_SIZE.depth,0,-cachePlan.palletHeight/2,0,metal,supplyCrate);
const cacheCartridges=new SupplyCartridges();cacheCartridges.root.position.set(CARTRIDGE_LAYOUT.fieldX,CARTRIDGE_LAYOUT.fieldY,CARTRIDGE_LAYOUT.fieldZ);cacheCartridges.root.scale.setScalar(CARTRIDGE_LAYOUT.fieldScale);supplyCrate.add(cacheCartridges.root);
function loadCargoCache(){void cacheCartridges.load(true);return attachRequested('cargo',supplyCrate,false).then(()=>{for(const node of cacheFallback)node.visible=false;}).catch(()=>console.warn('Field cache asset unavailable; supply fallback retained.'));}
const cacheTarget:Target={zone:'surface',name:'Inspect coolant supply cache',position:new THREE.Vector3(SURFACE_ORIGIN+SUPPLY_CACHE.x,cacheHeight+.75,SUPPLY_CACHE.z),action:()=>openSupplies('recover')};targets.push(cacheTarget);
const reserveStatus=new THREE.MeshBasicMaterial({color:0x77e5d4}),cacheStatus=reserveStatus.clone();
box(.75,.04,.04,0,1.45,.52,reserveStatus,coolantReserve);box(.75,.04,.04,0,.35,.52,cacheStatus,supplyCrate);
suppliesPanel.innerHTML='<p id="suppliesStatus" role="status"></p><button id="dischargeCoolant">Discharge one cartridge</button><button id="recoverCoolant">Recover cartridges</button><p class="powerHint">Each cartridge reduces thermal load by 25 points. A containment trip still needs the normal manual reset. The field cache can replenish your reserve once.</p>';
let suppliesMode:'discharge'|'recover'='discharge';
function paintSupplies(){
  const reserve=progress.supplies,blocked=suppliesMode==='discharge'?coolantBlock(progress.power,reserve):reserve.cacheClaimed?'This cache has been recovered.':reserve.coolant>=2?'Reserve full. Leave the cache until needed.':null;
  $('suppliesStatus').textContent=`RESERVE ${reserve.coolant}/2 · THERMAL ${Math.round(progress.power.heat)}%${blocked?` · ${blocked}`:''}`;
  $('dischargeCoolant').hidden=suppliesMode!=='discharge';$('recoverCoolant').hidden=suppliesMode!=='recover';
  $<HTMLButtonElement>(suppliesMode==='discharge'?'dischargeCoolant':'recoverCoolant').disabled=!!blocked;
}
function openSupplies(mode:'discharge'|'recover'){
  if(mode==='discharge')void reserveCartridges.load(true);
  suppliesMode=mode;speakingCrew=undefined;showDialogue(mode==='discharge'?'ENGINEERING / AUXILIARY COOLANT':'NYSA / FIELD SUPPLY CACHE',mode==='discharge'?'A finite emergency reserve supports the primary cooling circuit. It removes thermal load without clearing a latched containment trip.':'Two reserve cartridges were staged at this survey cache. Recover them when your ship reserve has room.');suppliesPanel.hidden=false;paintSupplies();
}
$('dischargeCoolant').onclick=()=>{if(!active||!dialogueOpen||suppliesPanel.hidden||suppliesMode!=='discharge')return;const next=dischargeCoolant(progress.power,progress.supplies);if(next.used){progress={...progress,power:next.power,supplies:next.supplies};save(false);paintPower();paintSupplies();tone(380);}};
$('recoverCoolant').onclick=()=>{if(!active||!dialogueOpen||suppliesPanel.hidden||suppliesMode!=='recover'||!onSurface)return;progress={...progress,supplies:recoverSupplies(progress.supplies,progress.forged)};if(trackedField==='supplies')trackedField=undefined;save(false);paintPower();paintSupplies();tone(520);};
scene.add(avatar);avatar.visible=false;
surface.setScans(progress.fieldScans);
const fieldLog=document.createElement('button');fieldLog.id='fieldLog';fieldLog.hidden=true;fieldLog.setAttribute('aria-keyshortcuts','J');$('navigationHud').append(fieldLog);
const surveyPanel=document.createElement('section');surveyPanel.id='surveyPanel';surveyPanel.hidden=true;surveyPanel.setAttribute('aria-label','Nysa field log');$('dialogue').insertBefore(surveyPanel,$('closeDialogue'));
fieldLog.onclick=()=>{
  if(vesperTrip){if(active&&!dialogueOpen&&vesperTrip.walking&&!vesperTrip.vehicles.riding)openVesperLog();return;}
  if(!active||dialogueOpen||(flight&&flight.phase!=='flying')||riding||!progress.forged)return;
  surveyPanel.setAttribute('aria-label','Nysa field log');speakingCrew=undefined;showDialogue('NYSA / FIELD LOG','Explore the survey sites or restore Nysa’s silent relay network. Repair both remote receivers, then activate the communications outpost to unlock a new Kestrel landing pad. You can return at any time.');surveyPanel.replaceChildren();surveyPanel.hidden=false;
  const mapClose=document.createElement('button');mapClose.id='closeFieldLog';mapClose.textContent='Close field log';mapClose.onclick=closeDialogue;surveyPanel.append(mapClose);
  const map=document.createElement('canvas');map.id='surveyMap';map.setAttribute('role','img');map.setAttribute('aria-label','Nysa terrain relief, north up. Tap to place a waypoint; coordinate controls below provide a keyboard alternative.');surveyPanel.append(map);
  const p=player.translation();drawSurveyMap(map,progress,onSurface?{x:p.x-SURFACE_ORIGIN,z:p.z,yaw}:undefined,typeof trackedField==='object'?trackedField:undefined,landingSite);
  const hint=document.createElement('p');hint.textContent=onSurface?'White arrow: you · green: recorded · amber: pending. Tap anywhere to track a local waypoint. INFO shows guidance; rocks may obstruct the direct route.':'Sector overview · Land on Nysa to place waypoints. Green marks recorded discoveries.';surveyPanel.append(hint);
  const pinForm=document.createElement('form');pinForm.id='pinForm';pinForm.innerHTML=`<label>Local X<input id="pinX" type="number" min="-${PIN_LIMIT}" max="${PIN_LIMIT}" step="1" value="0" required></label><label>Local Z<input id="pinZ" type="number" min="-${PIN_LIMIT}" max="${PIN_LIMIT}" step="1" value="0" required></label><button id="trackPin" type="submit">Track waypoint</button>`;surveyPanel.append(pinForm);for(const id of ['trackPin','pinX','pinZ'])$<HTMLButtonElement>(id).disabled=!onSurface;
  const choosePin=(pin:{x:number;z:number}|undefined)=>{if(!onSurface||!pin)return;trackedField=pin;closeDialogue();notify(`TRACKING · Local X ${pin.x.toFixed(0)} / Z ${pin.z.toFixed(0)}`);};
  pinForm.onsubmit=e=>{e.preventDefault();choosePin(surfacePin($<HTMLInputElement>('pinX').valueAsNumber,$<HTMLInputElement>('pinZ').valueAsNumber));};
  map.onclick=e=>{const r=map.getBoundingClientRect();if(r.width>0&&r.height>0)choosePin(mapPoint((e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height));};

  for(const site of FIELD_SITES){
    const scanned=progress.fieldScans.includes(site.id),row=document.createElement('article'),title=document.createElement('strong'),text=document.createElement('p'),button=document.createElement('button');
    title.textContent=site.label;text.textContent=scanned?site.reading:`NOT SCANNED · Local X ${site.x} / Z ${site.z}`;
    button.textContent=scanned?'Recorded':onSurface?'Track site':'Land on Nysa to scan';button.disabled=scanned||!onSurface;button.dataset.track=site.id;
    button.onclick=()=>{trackedField=site.id;closeDialogue();notify(`TRACKING · ${site.label}`);};row.append(title,text,button);surveyPanel.append(row);
  }
  const expedition=document.createElement('article');expedition.id='relayExpedition';
  const relayTitle=document.createElement('strong');relayTitle.textContent='EXPEDITION / SILENT NETWORK';
  const relayText=document.createElement('p');relayText.textContent=progress.network.online?'NETWORK ONLINE · Relay landing pad unlocked. The outpost archive remains readable.':`Receivers restored ${progress.network.repairs.length}/2. Repair both in either order, then transmit from the walk-in outpost at X ${OUTPOST.x} / Z ${OUTPOST.z}.`;
  const trackRelay=document.createElement('button');trackRelay.dataset.track='network';trackRelay.textContent=progress.network.online?'Track outpost archive':'Track next expedition objective';trackRelay.disabled=!onSurface;trackRelay.onclick=()=>{trackedField='network';closeDialogue();};expedition.append(relayTitle,relayText,trackRelay);
  for(const site of REPAIR_SITES){const text=document.createElement('p');text.textContent=`${progress.network.repairs.includes(site.id)?'✓ REPAIRED':'○ OFFLINE'} · ${site.label} · X ${site.x} / Z ${site.z}`;expedition.append(text);}surveyPanel.append(expedition);
  const vaultRow=document.createElement('article'),vaultTitle=document.createElement('strong'),vaultText=document.createElement('p'),vaultTrack=document.createElement('button');vaultTitle.textContent='EXPEDITION / SIGNAL VAULT';vaultText.textContent=progress.vault.archived?VAULT_ARCHIVE:progress.vault.calibrated?'CARRIER LOCKED · The vault door is open. Enter and recover Archive 04.':progress.network.online?'Archive 03 identifies a sealed vault at X66 / Z76. Tune its receiver to17.4 Hz and bearing120 degrees, then enter.':'A sealed research vault lies at X66 / Z76. Restore Silent Network to obtain its control link.';vaultTrack.dataset.track='vault';vaultTrack.textContent=progress.vault.archived?'Revisit archive':'Track Signal Vault';vaultTrack.disabled=!onSurface;vaultTrack.onclick=()=>{trackedField='vault';closeDialogue();};vaultRow.append(vaultTitle,vaultText,vaultTrack);surveyPanel.append(vaultRow);
  const salvageRow=document.createElement('article'),salvageTitle=document.createElement('strong'),salvageText=document.createElement('p'),salvageTrack=document.createElement('button');salvageTitle.textContent='ROVER CONTRACT / LOST RECORDER';salvageText.textContent=progress.salvage==='delivered'?SALVAGE_ARCHIVE:progress.salvage==='loaded'?'Recorder secured on the rover. Drive to the outpost depot at X69 / Z-73. Brake, dismount and use its terminal to deliver.':progress.network.online?'Recover the recorder at X-98 / Z80 using the rover, then deliver it to the outpost depot. Delivery unlocks16 m/s rover cruise.':'Restore Silent Network to release the recorder transport lock.';salvageTrack.dataset.track='salvage';salvageTrack.textContent=progress.salvage==='waiting'?'Track lost recorder':'Track cargo depot';salvageTrack.disabled=!onSurface;salvageTrack.onclick=()=>{trackedField='salvage';closeDialogue();};salvageRow.append(salvageTitle,salvageText,salvageTrack);surveyPanel.append(salvageRow);
  const droneRow=document.createElement('article'),droneTitle=document.createElement('strong'),droneText=document.createElement('p'),trackDrone=document.createElement('button');droneTitle.textContent='ECHO / SURVEY COMPANION';droneText.textContent=progress.droneRecovered?`Recovered · ${surveyDrone.snapshot().status}. ECHO follows on foot, holds when you drive, and can scan unread sites within8m. Approach it for commands.`:progress.network.online?'ECHO is waiting beside the communications outpost. Approach and press E to reactivate it.':'Restore Silent Network to reactivate the survey drone beside the outpost.';trackDrone.dataset.track='drone';trackDrone.textContent='Locate ECHO';trackDrone.disabled=!onSurface;trackDrone.onclick=()=>{trackedField='drone';closeDialogue();};droneRow.append(droneTitle,droneText,trackDrone);surveyPanel.append(droneRow);
  const reserveRow=document.createElement('article'),reserveTitle=document.createElement('strong'),reserveText=document.createElement('p'),trackReserve=document.createElement('button');reserveTitle.textContent='Coolant supply cache';reserveText.textContent=`Reserve ${progress.supplies.coolant}/2 · ${progress.supplies.cacheClaimed?'CACHE RECOVERED':`Local X ${SUPPLY_CACHE.x} / Z ${SUPPLY_CACHE.z} · one-time refill`}`;trackReserve.textContent=onSurface?'Track cache':'Land on Nysa to recover';trackReserve.disabled=!onSurface||progress.supplies.cacheClaimed;trackReserve.dataset.track='supplies';trackReserve.onclick=()=>{trackedField='supplies';closeDialogue();};reserveRow.append(reserveTitle,reserveText,trackReserve);surveyPanel.append(reserveRow);
  const mission=document.createElement('button');mission.id='trackMission';mission.textContent='Restore mission guidance';mission.disabled=!onSurface;mission.onclick=()=>{trackedField=undefined;closeDialogue();};surveyPanel.append(mission);
  const orbitalRow=document.createElement('article'),orbitalTitle=document.createElement('strong'),orbitalText=document.createElement('p'),orbitalTrack=document.createElement('button');orbitalRow.id='orbitalSignal';orbitalTitle.textContent='ORBITAL EXPEDITION / WAYFINDER';orbitalText.textContent=progress.signalRecovered?SIGNAL_ARCHIVE:progress.vault.archived?'Archive 04 decodes a derelict relay at sector X−420 / Y95 / Z−360. Fly Kestrel within45m, brake below6m/s and point its nose at the relay. E scans for three seconds.':'Recover Signal Vault Archive 04 to decode the orbital relay.';orbitalTrack.dataset.track='signal';orbitalTrack.textContent='Track Wayfinder in orbit';orbitalTrack.disabled=!progress.vault.archived;orbitalTrack.onclick=()=>{trackedVesper=false;trackedSignal=true;orbitalScan.cancel();closeDialogue();notify(flight?'WAYFINDER tracked. T returns to Nysa/Erebus guidance.':'WAYFINDER tracked for your next manual spaceflight.');};orbitalRow.append(orbitalTitle,orbitalText,orbitalTrack);surveyPanel.prepend(orbitalRow);
  const vesperRow=document.createElement('article'),vesperTitle=document.createElement('strong'),vesperText=document.createElement('p'),vesperTrack=document.createElement('button');vesperRow.id='vesperExpedition';vesperTitle.textContent='SECOND WORLD / VESPER';vesperText.textContent=progress.vesperArchived?VESPER_ARCHIVE:progress.signalRecovered?'Wayfinder charts a frozen basin on Vesper. Pilot Kestrel to its near-side ring, brake below18m/s, then E begins landing. Survey the frost shelf and warm fissure on foot; the jet remains available for return.':'Recover Wayfinder Archive05 to chart this destination.';vesperTrack.dataset.track='vesper';vesperTrack.textContent='Track Vesper landing';vesperTrack.disabled=!progress.signalRecovered;vesperTrack.onclick=()=>{trackedVesper=true;trackedSignal=false;orbitalScan.cancel();closeDialogue();notify('VESPER tracked for manual spaceflight. T restores Nysa/Erebus guidance.');};vesperRow.append(vesperTitle,vesperText,vesperTrack);surveyPanel.prepend(vesperRow);
  $('speaker').tabIndex=-1;$('speaker').focus({preventScroll:true});$('dialogue').scrollTop=0;
};
const landedShuttle=makeShuttle();landedShuttle.position.set(0,0,LANDING.z);surface.group.add(landedShuttle);
const launchBay=new LaunchBay();scene.add(launchBay.root);shipNodes.push(launchBay.root);
const boardJetTarget:Target={name:'Board parked Kestrel',position:new THREE.Vector3(LAUNCH_BAY.boarding.x,LAUNCH_BAY.boarding.y,LAUNCH_BAY.boarding.z),action:()=>boardParkedJet()};targets.push(boardJetTarget);
const boardingLight=box(.08,.8,.08,2.9,.45,-23.6,cyan,launchBay.root);
const surfaceCraft=makeShuttle();scene.add(surfaceCraft);surfaceCraft.visible=false;
const feedback=new FlightFeedback(),orbitalThrusters=createThrusters(),surfaceThrusters=createThrusters();flightWorld.scene.add(orbitalThrusters.root);scene.add(surfaceThrusters.root);
const turboFeedback=new TurboFeedback();const suspensions=new Map<VehicleKind,VehicleSuspension>();
const vehicleGround=terrainSampler(surface.mesh.vertices);const relayOutpost=new RelayOutpost(vehicleGround,SURFACE_ORIGIN);surface.group.add(relayOutpost.root);relayOutpost.setState(progress.network);const surveyDrone=new SurveyDrone(vehicleGround);scene.add(surveyDrone.root);const vehicleStances=new Map<VehicleKind,VehicleStance>();
const signalVault=new SignalVaultScene(SURFACE_ORIGIN);surface.group.add(signalVault.root);signalVault.setState(progress.vault,true);
const roverSalvage=new RoverSalvageScene(vehicleGround,SURFACE_ORIGIN);surface.group.add(roverSalvage.root);roverSalvage.setState(progress.salvage);
const surfaceSky=new THREE.Color(0x678b9a);
const flightHud=document.createElement('aside');flightHud.id='flightHud';flightHud.hidden=true;flightHud.setAttribute('aria-label','Shuttle flight controls');
flightHud.innerHTML='<span class="eyebrow">KESTREL / SURVEY SHUTTLE</span><strong id="flightTelemetry"></strong><span id="flightStatus" role="status"></span><div><button id="flightBrake">BRAKE / SPACE</button><button id="flightBoost">BOOST / SHIFT</button><button id="flightTarget">TARGET: NYSA</button><button id="flightPad" aria-keyshortcuts="L" aria-label="Choose Nysa landing pad">PAD: SURVEY</button></div><small>W/S throttle · A/D turn · arrows pitch · mouse/drag look · E land/dock</small>';$('hud').append(flightHud);
const flightClouds=document.createElement('div');flightClouds.id='flightClouds';flightClouds.setAttribute('aria-hidden','true');document.body.insertBefore(flightClouds,$('hud'));
const speedControl=document.createElement('label');speedControl.id='speedControl';speedControl.hidden=true;speedControl.innerHTML='<span>SPEED</span><input id="vehicleSpeed" type="range" min="0" max="100" value="0" step="1" aria-label="Vehicle speed"><output id="speedPercent">0%</output>';$('hud').append(speedControl);const speedSlider=$<HTMLInputElement>('vehicleSpeed');speedSlider.oninput=()=>{if(active&&!dialogueOpen){if(vesperTrip?.vehicles.riding)vesperTrip.vehicles.demand=Number(speedSlider.value)/100;else if(flight?.phase==='flying'||riding)speedDemand=Number(speedSlider.value)/100;}};
const velocityMarker=document.createElement('div');velocityMarker.id='velocityMarker';velocityMarker.hidden=true;velocityMarker.setAttribute('aria-hidden','true');velocityMarker.innerHTML='<span>◇</span><small>VELOCITY</small>';$('hud').append(velocityMarker);
const projectedVelocity=new THREE.Vector3(),velocityForward=new THREE.Vector3();let approachWarning=false;
for(const [id,set] of [['flightBrake',(v:boolean)=>flightBrake=v],['flightBoost',(v:boolean)=>flightBoost=v]] as const){const button=$(id);button.onpointerdown=e=>{button.setPointerCapture(e.pointerId);set(true);};button.onpointerup=button.onpointercancel=()=>set(false);}
$('flightTarget').onclick=()=>{if(flight?.phase==='flying'){orbitalScan.cancel();if(trackedSignal||trackedVesper){trackedSignal=false;trackedVesper=false;}else flight={...flight,leg:flight.leg==='nysa'?'erebus':'nysa'};paintNavigation();}};
$('flightPad').onclick=()=>{if(!trackedSignal&&!trackedVesper&&flight?.phase==='flying'&&flight.leg==='nysa'){flight={...flight,site:nextLandingSite(flight.site,progress.network.online)};paintNavigation();}};
function requestRunwayAccess(){if(launchBay.state.requestAccess()){notify('Runway inner door '+(launchBay.state.access?'opening. Board the parked jet at its cyan marker.':'closing.'));}else notify('Launch interlock active.');}
function boardParkedJet(){const blocked=landingBlock(progress.forged,progress.power.tripped);if(blocked){notify(blocked);return;}if(!launchBay.state.board()){notify('Launch interlock is busy.');return;}void flightWorld.loadCockpit().catch(()=>console.warn('Cockpit fallback active'));clearInput();playerCollider.setEnabled(false);nearest=undefined;yaw=0;pitch=0;notify('Boarded Kestrel. Inner door sealing before outer door opens.');}
function launchFlight(leg:FlightLeg,fromRunway=false){
  if(crewTour)crewTour=cancelTour(crewTour);
  if(flight)return;
  orbitalScan.cancel();void orbitalProbe.load(true);
  void flightWorld.loadCockpit().catch(()=>console.warn('Cockpit asset unavailable; generated instruments retained'));
  void loadAuthoredAsset('craft',[landedShuttle,flightWorld.craft,surfaceCraft]).catch(()=>console.warn('Craft asset unavailable; procedural shuttle fallback active.'));
  void flightWorld.loadHabitat().catch(()=>console.warn('Station asset unavailable; docking habitat fallback active.'));
  if(leg==='nysa')for(const [kind,mesh] of vehicleVisuals)void attachRequested(kind,mesh).catch(()=>console.warn('Surface vehicle asset unavailable; physical fallback active.'));
  clearInput();nearest=undefined;flight=fromRunway&&leg==='nysa'?startRunwayFlight(landingSite):startFlight(leg,landingSite);pilot={yaw:fromRunway?launchBay.state.jetYaw:leg==='nysa'?0:Math.PI,pitch:0};if(!fromRunway){yaw=0;pitch=0;}speedDemand=flight.throttle;feedback.reset(pilot.yaw);
  updateHud();$('objective').textContent='Pilot Kestrel';$('missionText').textContent='Fly to the cyan approach ring. Brake below 18 m/s, then press E to land or dock.';paintNavigation();notify(leg==='nysa'?'KESTREL · Launching from Erebus shuttle bay.':'KESTREL · Lifting off Nysa. Return corridor charted.');
}
function beginBayReturn(){
  clearInput();nearest=undefined;riding=null;speedDemand=0;onSurface=false;setSurfaceView(false);
  lightBudget.configure($<HTMLSelectElement>('quality').value==='high',true);playerCollider.setEnabled(false);
  launchBay.state.beginReturn();launchBay.sync();yaw=pitch=0;
  void loadAuthoredAsset('craft',[launchBay.jet]).catch(()=>console.warn('Docking craft fallback retained'));
  notify('KESTREL · Returning through the runway. Outer door will seal before station access opens.');paintNavigation();
}
function finishBayReturn(){
  launchBay.state.disembark();launchBay.sync();clearInput();verticalSpeed=0;playerJumping=false;
  const p={...LAUNCH_BAY.exit};player.setTranslation(p,true);player.setNextKinematicTranslation(p);playerCollider.setEnabled(true);world.step();
  yaw=Math.PI;pitch=-.08;avatar.rotation.set(0,0,0);avatarBlend=0;flightWorld.hide();updateHud();paintNavigation();save(false);
  notify('DOCKED · Outer door sealed. Inner door open. Step into the station or board again.');
}
function travel(landing:boolean){
  if(crewTour)crewTour=cancelTour(crewTour);
  launchBay.state.reset();launchBay.sync();riding=null;playerJumping=false;if(playerCollider)playerCollider.setEnabled(true);speedDemand=0;
  orbitalThrusters.root.visible=surfaceThrusters.root.visible=false;
  clearInput();verticalSpeed=0;nearest=undefined;speakingCrew=undefined;trackedField=undefined;
  setSurfaceView(landing);onSurface=landing;if(landing)surveyDrone.arrive(progress.droneRecovered,landingPad(landingSite));else surveyDrone.hold();
  lightBudget.configure($<HTMLSelectElement>('quality').value==='high',!landing);
  const pad=landingPad(landingSite);
  const spawn=landing?{x:SURFACE_ORIGIN+pad.x-3.8,y:terrainHeight(pad.x-3.8,pad.z+2)+1.05,z:pad.z+2}:{x:SHIP_LAYOUT.spawn.x,y:.9,z:SHIP_LAYOUT.spawn.z};
  player.setTranslation(spawn,true);player.setNextKinematicTranslation(spawn);yaw=0;pitch=-.08;
  avatar.rotation.set(0,Math.PI,0);avatarBlend=0;
  camera.position.set(spawn.x,spawn.y+.74,spawn.z);camera.rotation.set(pitch,yaw,0);
  updateHud();paintNavigation();save(false);notify(landing?'NYSA / SURVEY SITE · Locate the luminous outcrop.':'EREBUS / COMMAND DECK · Extraction complete.');
}
function setSurfaceView(landing:boolean){
  // Entering the descent view must not overwrite the original ship visibility cache.
  if(landing&&shipVisibility.size===0){for(const node of shipNodes){shipVisibility.set(node,node.visible);node.visible=false;}}
  else if(!landing){for(const [node,visible] of shipVisibility)node.visible=visible;shipVisibility.clear();}
  surface.group.visible=landing;if(landing){void loadCargoCache();void surface.rockScenery.load(true);void surface.plants.load(true);void relayOutpost.load(true);void signalVault.load(true);void roverSalvage.load(true);void surveyDrone.load(true);}
  scene.background=landing?surfaceSky:new THREE.Color(SPACE_COLOR);scene.fog=landing?new THREE.FogExp2(surfaceSky,.0035):null;
}
$('deployNysa').onclick=()=>{
  if(!active||!dialogueOpen||$('expeditionPanel').hidden)return;
  const blocked=landingBlock(progress.forged,progress.power.tripped);if(blocked){notify(blocked);return;}
  closeDialogue();boardParkedJet();
};
const sampleTarget:Target={zone:'surface',name:'Survey luminous outcrop',position:new THREE.Vector3(SURFACE_ORIGIN+SAMPLE.x,terrainHeight(SAMPLE.x,SAMPLE.z)+.8,SAMPLE.z),action:()=>{
  if(!progress.surveyed){progress={...progress,surveyed:true};save();tone(660);notify('SAMPLE SECURED · Board the parked shuttle for the return flight.');}
  else notify('Outcrop surveyed. Return to your parked shuttle.');
}};targets.push(sampleTarget);
const extractionTarget:Target={zone:'surface',name:'Board shuttle for Erebus',position:new THREE.Vector3(SURFACE_ORIGIN,1.2,LANDING.z+SHUTTLE_HATCH_Z),action:()=>launchFlight('erebus')};targets.push(extractionTarget);
function setLandingSite(site:LandingSite){
  landingSite=site;const pad=landingPad(site);landedShuttle.position.set(pad.x,0,pad.z);surface.setLanding(site);for(const [kind,v] of groundVehicles){const x=pad.x+(kind==='bike'?7:-8),z=pad.z+7;v.relocate({x:SURFACE_ORIGIN+x,y:terrainHeight(x,z),z});}
  extractionTarget.position.set(SURFACE_ORIGIN+pad.x,1.2,pad.z+SHUTTLE_HATCH_Z);extractionTarget.collider?.setTranslation({x:extractionTarget.position.x,y:1.2,z:extractionTarget.position.z});
  parkedShuttleCollider.setTranslation({x:SURFACE_ORIGIN+pad.x,y:SHUTTLE_SIZE[1]/2,z:pad.z});
}
const fieldTargets=surface.scanners.map(scanner=>{
  const site=FIELD_SITES.find(s=>s.id===scanner.id)!;
  const target:Target={zone:'surface',name:`Scan ${site.label.toLowerCase()}`,position:scanner.position,action:()=>{
    progress=recordFieldScan(progress,site.id);if(trackedField===site.id)trackedField=undefined;surface.setScans(progress.fieldScans);save();tone(740);
    speakingCrew=undefined;showDialogue(`NYSA / ${site.label.toUpperCase()}`,site.reading);
  }};targets.push(target);return target;
});
const networkTargets=relayOutpost.terminals.map(terminal=>{
  const target:Target={zone:'surface',name:terminal.label,position:terminal.position,action:()=>{
    speakingCrew=undefined;
    if(terminal.id==='uplink'){
      const blocked=uplinkBlock(progress.network,progress.forged);
      if(blocked){showDialogue('RELAY 03 / UPLINK OFFLINE',blocked);return;}
      const wasOnline=progress.network.online;progress={...progress,network:activateUplink(progress.network,progress.forged)};
      relayOutpost.setState(progress.network);surface.setRelayOnline(progress.network.online);save();tone(880);
      showDialogue('RELAY 03 / ARCHIVE',wasOnline?'ARCHIVE 03 · The outpost was built to monitor the forge. Both remote receivers agree: every 17.4 Hz pulse precedes a new ring alignment. The signal is arriving before its source. The sealed Signal Vault at X66 / Z76 listens on17.4 Hz, antenna bearing120 degrees. FIELD LOG can track it.':'NETWORK RESTORED · Kestrel can now select the Relay landing pad with PAD / L while flying toward Nysa. The antenna is tracking the forge. Archive 03 reports a repeating signal that arrives before its source. Return to this console to read the archive.');
    }else{
      const site=REPAIR_SITES.find(s=>s.id===terminal.id)!;const done=progress.network.repairs.includes(site.id);progress={...progress,network:repairRelay(progress.network,site.id,progress.forged)};relayOutpost.setState(progress.network);save();tone(620);
      showDialogue('NYSA / '+site.label.toUpperCase(),done?site.reading:site.reading+(progress.network.repairs.length===2?' Both carriers are restored. Transmit from the communications outpost.':' FIELD LOG can track the next receiver.'));
    }
  }};targets.push(target);return target;
});
function syncSalvage(){roverSalvage.setState(progress.salvage);const rover=groundVehicles.get('rover');if(rover)rover.driveCalibrated=progress.salvage==='delivered';}
const salvageTargets=roverSalvage.sites.map(site=>{const target:Target={zone:'surface',name:site.id==='load'?'Load recorder into rover':'Deliver rover recorder',position:site.position,action:()=>{
 const rover=groundVehicles.get('rover'),p=rover?.body.translation(),parked=p&&rover?{x:p.x-SURFACE_ORIGIN,y:p.y,z:p.z,speed:rover.speed,visible:roverSalvage.visibleFrom({x:p.x,y:p.y+.35,z:p.z},rover.collider,site.id)}:undefined;
 const blocked=salvageBlock(progress.salvage,progress.network.online,site.id,parked,site.base);if(blocked){showDialogue('ROVER / SALVAGE CONTRACT',blocked+(progress.salvage==='delivered'?' '+SALVAGE_ARCHIVE:''));return;}
 progress={...progress,salvage:site.id==='load'?'loaded':'delivered'};syncSalvage();save();tone(site.id==='load'?620:880);showDialogue('ROVER / '+(site.id==='load'?'CARGO SECURED':'DELIVERY COMPLETE'),site.id==='load'?'The recorder is secured to the rear rack. Board the rover and drive to the outpost depot at X69 / Z-73. Brake, dismount and use its terminal. FIELD LOG now tracks the depot.':SALVAGE_ARCHIVE);
 }};targets.push(target);return target;});
let vaultFrequency=progress.vault.calibrated?17.4:15,vaultBearing=progress.vault.calibrated?120:0;
signalVault.tune(vaultFrequency,vaultBearing);
const vaultPanel=document.createElement('section');vaultPanel.id='vaultPanel';vaultPanel.hidden=true;vaultPanel.setAttribute('aria-label','Signal Vault receiver tuning');$('dialogue').insertBefore(vaultPanel,$('closeDialogue'));
vaultPanel.innerHTML='<label for="vaultFrequency">Carrier frequency <output id="vaultHz"></output></label><input id="vaultFrequency" type="range" min="14" max="20" step="0.1" aria-label="Carrier frequency in hertz"><label for="vaultBearing">Antenna bearing <output id="vaultDegrees"></output></label><input id="vaultBearing" type="range" min="0" max="350" step="10" aria-label="Antenna bearing in degrees"><p id="vaultStrength" role="status"></p><button id="vaultLock">Lock carrier / open vault</button>';
function paintVault(){for(const id of ['vaultFrequency','vaultBearing'])$<HTMLInputElement>(id).disabled=progress.vault.calibrated;const reading=carrierReading(vaultFrequency,vaultBearing);$<HTMLInputElement>('vaultFrequency').value=String(vaultFrequency);$<HTMLInputElement>('vaultBearing').value=String(vaultBearing);$('vaultHz').textContent=vaultFrequency.toFixed(1)+' Hz';$('vaultDegrees').textContent=vaultBearing+'°';$('vaultStrength').textContent=progress.vault.calibrated?'CARRIER LOCKED · Leave this panel to watch the door open.':Math.round(reading.strength*100)+'% signal · '+(reading.locked?'Stable carrier. Lock to release the vault door.':'Adjust both controls. Archive 03 gives17.4 Hz /120°.');$<HTMLButtonElement>('vaultLock').disabled=progress.vault.calibrated;signalVault.tune(vaultFrequency,vaultBearing);}
for(const id of ['vaultFrequency','vaultBearing'])$(id).oninput=()=>{if(!active||!dialogueOpen||vaultPanel.hidden||progress.vault.calibrated)return;vaultFrequency=$<HTMLInputElement>('vaultFrequency').valueAsNumber;vaultBearing=$<HTMLInputElement>('vaultBearing').valueAsNumber;paintVault();};
$('vaultLock').onclick=()=>{if(!active||!onSurface||!dialogueOpen||vaultPanel.hidden)return;const next=calibrateVault(progress.vault,progress.network.online,vaultFrequency,vaultBearing);if(next===progress.vault){$('vaultStrength').textContent='Carrier unstable. Match17.4 Hz and120° before locking.';tone(160);return;}progress={...progress,vault:next};signalVault.setState(progress.vault);save();tone(880);closeDialogue();notify('SIGNAL VAULT / Carrier locked. Door opening. Enter for Archive 04.');};
const vaultTargets=signalVault.terminals.map(terminal=>{const target:Target={zone:'surface',name:terminal.label,position:terminal.position,action:()=>{speakingCrew=undefined;
 if(!progress.network.online){showDialogue('SIGNAL VAULT / LINK OFFLINE','Restore both Silent Network receivers and activate the outpost uplink. Its archive contains the vault carrier and bearing.');return;}
 if(terminal.id==='receiver'){showDialogue('SIGNAL VAULT / RECEIVER','An older research vault is listening to the same pulse as the forge. Tune the carrier and antenna, then lock the stable signal to release its door.');vaultPanel.hidden=false;paintVault();}
 else if(!progress.vault.calibrated)showDialogue('SIGNAL VAULT / SEALED','Calibrate the exterior receiver before accessing this archive.');
 else{progress={...progress,vault:recoverVault(progress.vault,progress.network.online)};signalVault.setState(progress.vault);save();tone(720);showDialogue('SIGNAL VAULT / ARCHIVE 04',VAULT_ARCHIVE);}
 }};targets.push(target);return target;});
const dronePanel=document.createElement('section');dronePanel.id='dronePanel';dronePanel.hidden=true;dronePanel.setAttribute('aria-label','ECHO companion commands');$('dialogue').insertBefore(dronePanel,$('closeDialogue'));
dronePanel.innerHTML='<button id="droneFollow">Follow me</button><button id="droneHold">Hold here</button><button id="droneScan">Scan nearby survey site</button><p id="droneScanHint"></p>';
function openVesperLog(){
 const trip=vesperTrip;if(!trip)return;const echo=trip.companion;showDialogue('VESPER / SURVEY LOG',`${progress.vesperReadings.length}/2 readings recorded. ${progress.vesperArchived?VESPER_ARCHIVE:'Survey frost and warmth, then recover the basin archive.'} ${echo.drone.available?'ECHO accompanies this expedition. Approach it for Follow, Hold and nearby scans.':'Recover ECHO beside Nysa’s communications outpost to bring it on future Vesper visits.'}`);surveyPanel.replaceChildren();surveyPanel.setAttribute('aria-label','Vesper field log');surveyPanel.hidden=false;for(const [label,track]of [['Locate ECHO',true],['Track survey objective',false]] as const){const b=document.createElement('button');b.textContent=label;b.dataset.vesperTrack=track?'echo':'survey';b.disabled=track&&!echo.drone.available;b.onclick=()=>{if(vesperTrip!==trip)return;echo.track=track;closeDialogue();};surveyPanel.append(b);}
}
function openVesperDrone(){const trip=vesperTrip;if(!trip||!trip.walking||trip.vehicles.riding||!trip.companion.drone.available)return;showDialogue('ECHO / VESPER COMPANION','Ready. I follow your walked route and hold when you board a vehicle. Approach me for commands. Scan records an unread frost or warmth reading within8m and clear sight over two active seconds. The field log can locate me.');dronePanel.hidden=false;const id=trip.companion.availableScan();$<HTMLButtonElement>('droneScan').disabled=!id;$('droneScanHint').textContent=id?'Nearby: '+VESPER_SITES.find(s=>s.id===id)!.label+'. Scanning stops following; choose Follow again afterward.':'No unread basin sampler within8m and clear sight.';}
function vesperDroneCommand(command:'follow'|'hold'|'scan'){const trip=vesperTrip;if(!trip||!active||!dialogueOpen||dronePanel.hidden||!trip.walking||trip.vehicles.riding||!trip.companion.drone.available)return;const echo=trip.companion;if(command==='follow')echo.follow(trip.player.translation());else if(command==='hold')echo.drone.hold();else if(!echo.scan())return;closeDialogue();notify('ECHO / '+(command==='follow'?'Following your route on foot.':command==='hold'?'Holding position. FIELD LOG can locate me.':'Scanning basin sampler…'));}
function availableDroneScan(){return droneScanSite(surveyDrone.root.position,progress.fieldScans,surface.scanners,(anchor,id)=>clearSight(world,surveyDrone.root.position,anchor,playerCollider,fieldTargets.find((_,i)=>surface.scanners[i].id===id)?.collider));}
function openDrone(){
  speakingCrew=undefined;
  if(!progress.network.online){showDialogue('ECHO / STANDBY','Relay control link offline. Restore both receivers and activate the outpost uplink before reactivating ECHO. FIELD LOG can track Silent Network.');return;}
  if(!progress.droneRecovered){progress={...progress,droneRecovered:true};surveyDrone.recover();save();tone(780);}
  showDialogue('ECHO / SURVEY COMPANION','Ready. Follow uses your walked route, with short detours around obstacles. Sealed or tight routes make me hold safely. I wait when you board a vehicle. Scan records an unread survey site within8m and clear sight over two seconds. Field Log can locate me.');dronePanel.hidden=false;
  const scan=availableDroneScan();$<HTMLButtonElement>('droneScan').disabled=!scan;$('droneScanHint').textContent=scan?'Nearby: '+FIELD_SITES.find(s=>s.id===scan)!.label+'. Scanning stops following; choose Follow again afterward.':'No unread survey site within8m and clear sight.';
}
const droneTarget:Target={zone:'surface',name:'Speak to ECHO',position:surveyDrone.root.position,action:openDrone};targets.push(droneTarget);
$('droneFollow').onclick=()=>{if(vesperTrip){vesperDroneCommand('follow');return;}if(!active||!dialogueOpen||dronePanel.hidden||!onSurface||!progress.droneRecovered)return;surveyDrone.startFollowing(surveyDrone.visitor(world,player.translation(),playerCollider));closeDialogue();notify('ECHO / Following your route on foot.');};
$('droneHold').onclick=()=>{if(vesperTrip){vesperDroneCommand('hold');return;}if(!active||!dialogueOpen||dronePanel.hidden||!onSurface||!progress.droneRecovered)return;surveyDrone.hold();closeDialogue();notify('ECHO / Holding position. FIELD LOG can locate me.');};
$('droneScan').onclick=()=>{if(vesperTrip){vesperDroneCommand('scan');return;}if(!active||!dialogueOpen||dronePanel.hidden||!onSurface||!progress.droneRecovered)return;const id=availableDroneScan();if(!id)return;surveyDrone.startScan(id);closeDialogue();notify('ECHO / Scanning '+FIELD_SITES.find(s=>s.id===id)!.label+'…');};
let navigationTimer=0;
function paintNavigation(){
  const visible=active&&!dialogueOpen;
  if(launchBay.state.boarded){flightHud.hidden=!visible;fieldLog.hidden=true;speedControl.hidden=true;$('hud').classList.add('piloting');for(const id of ['flightBrake','flightBoost','flightTarget','flightPad'])$(id).hidden=true;$('flightTelemetry').textContent='KESTREL / LAUNCH AIRLOCK';$('flightStatus').textContent=launchBay.state.status;return;}
  $('hud').classList.toggle('piloting',!!flight||!!riding);speedControl.hidden=!visible||(!flight&&!riding);speedSlider.disabled=!riding&&flight?.phase!=='flying';speedSlider.value=String(Math.round(speedDemand*100));$('speedPercent').textContent=speedSlider.value+'%';speedSlider.setAttribute('aria-valuetext',speedSlider.value+' percent');
  fieldLog.hidden=!visible||(!!flight&&flight.phase!=='flying')||!!riding||!progress.forged;fieldLog.textContent=`FIELD LOG / J · ${progress.fieldScans.length}/${FIELD_SITES.length} · RELAY ${progress.network.online?'ONLINE':progress.network.repairs.length+'/2'}`;
  flightHud.hidden=!visible||(!flight&&!riding);$('flightBrake').hidden=false;$('flightTarget').hidden=$('flightPad').hidden=!!riding;$('flightBoost').hidden=!!riding;if(riding){$('flightTelemetry').textContent=`${riding.kind.toUpperCase()} · ${riding.speed.toFixed(1)} m/s`;$('flightStatus').textContent='BRAKE then E to dismount'+(riding.kind==='rover'?(progress.salvage==='loaded'?' · RECORDER SECURED':progress.salvage==='delivered'?' · CRUISE16 m/s':''):'');}
  $('navigationHud').hidden=!visible;
  if(!visible)return;
  if(flight){
    if(trackedVesper&&flight.phase==='flying'){paintVesperNavigation();return;}
    if(trackedSignal&&flight.phase==='flying'){
      const reading=navigationReading(flight.position,pilot.yaw,WAYFINDER),distance=signalDistance(flight.position),speed=flightSpeed(flight),blocked=signalBlock(flight,progress.vault.archived,pilot.yaw,pilot.pitch);
      const advice=approachGuidance(flight,pilot.yaw,pilot.pitch,{target:WAYFINDER,range:SIGNAL_RANGE,speed:SIGNAL_SPEED,ready:!blocked});approachWarning=advice.brakeNow;
      $('compassHeading').textContent=`${reading.direction} / ${Math.round(reading.heading)}°`;$('navLabel').textContent='Wayfinder orbital relay';$('navDistance').textContent=`${Math.round(distance)} m · ${reading.turn}`;$('navArrow').style.transform=`rotate(${reading.relativeDegrees}deg)`;
      $('navHint').textContent=`Relay altitude95m. Nose within20°, range45m, speed≤6m/s. ${Math.round(advice.closing)} m/s closing · stop ~${Math.round(advice.stop.distance)}m. T restores landing guidance.`;$('navigationHud').dataset.destination='flight-signal';
      $('flightTelemetry').textContent=`${speed.toFixed(1)} m/s · WAYFINDER ${Math.round(distance)}m`;$('flightStatus').textContent=orbitalScan.active?`RECEIVING ARCHIVE ${Math.round(orbitalScan.snapshot().progress*100)}%`:advice.brakeNow?'WAYFINDER / BRAKE NOW':blocked??(progress.signalRecovered?'[ E ] READ ARCHIVE 05':'[ E ] SCAN WAYFINDER');flightHud.dataset.approach=advice.ready?'ready':advice.brakeNow?'brake':'cruise';$('flightPad').hidden=true;$('flightTarget').textContent='TARGET: WAYFINDER / T';return;
    }
    const ground=isSurfaceFlight(flight),pose=ground?surfaceFlightPose(flight.timer,flight.phase==='ascending',flight.site):null;
    const target=pose?landingPad(flight.site):flight.phase==='landing'?NYSA_CENTER:flight.phase==='docking'?{x:0,y:0,z:52}:flightGoal(flight);
    const reading=navigationReading(pose?.position??flight.position,pose?.yaw??pilot.yaw,target),distance=flightDistance(flight),speed=flightSpeed(flight);
    $('compassHeading').textContent=`${reading.direction} / ${Math.round(reading.heading)}°`;$('navLabel').textContent=flight.leg==='nysa'?'Nysa landing corridor':'Erebus shuttle bay';
    $('navDistance').textContent=`${Math.round(distance)} m · ${reading.turn}`;$('navArrow').style.transform=`rotate(${reading.relativeDegrees}deg)`;
    $('navHint').textContent='Align with the cyan ring. Brake below 18 m/s within 100 m, then press E.';$('navigationHud').dataset.destination=`flight-${flight.leg}`;
    $('flightTelemetry').textContent=pose?`RADAR ALT ${pose.altitude.toFixed(1)} m · ${Math.round(pose.progress*100)}%`:`${Math.round(speed)} m/s · THROTTLE ${Math.round(flight.throttle*100)}%`;
    $('flightStatus').textContent=ground?(flight.phase==='descending'?'GUIDED DESCENT · TOUCHDOWN':'GUIDED ASCENT · CLIMBING'):flight.phase==='flying'?(canApproach(flight)?`[ E ] ${flight.leg==='nysa'?'LAND ON NYSA':'DOCK WITH EREBUS'}`:'Approach ring · slow down to land or dock'):flight.phase.toUpperCase();
    approachWarning=false;flightHud.dataset.approach='';
    if(flight.phase==='flying'){
      const advice=approachGuidance(flight,pilot.yaw,pilot.pitch);approachWarning=advice.brakeNow;
      flightHud.dataset.approach=advice.ready?'ready':advice.brakeNow?'brake':advice.movingAway?'receding':'cruise';
      if(!advice.ready)$('flightStatus').textContent=advice.brakeNow?`Approach ring · BRAKE NOW · stop ~${Math.round(advice.stop.distance)} m`:advice.movingAway?'Approach ring · TARGET RECEDING · turn back':'Approach ring · slow down to land or dock';
      if(flight.leg==='erebus'&&distance<=100&&speed<=18&&!inDockingZone(flight.position)){flightHud.dataset.approach='entry';$('flightStatus').textContent='FRONT APPROACH REQUIRED';}
      $('navHint').textContent=`Closing ${Math.round(advice.closing)} m/s · lateral drift ${Math.round(advice.lateral)} m/s. Held-brake estimate: ${Math.round(advice.stop.distance)} m / ${advice.stop.time.toFixed(1)} s. Amber diamond shows velocity, not aim. E requires <18 m/s within 100 m.`;
    }
    if(flight.phase==='landing'||flight.phase==='docking'){
      $('flightTelemetry').textContent=`GUIDED CAPTURE ${Math.round(flight.timer/(flight.phase==='docking'?DOCKING_SECONDS:3)*100)}%`;
      $('flightStatus').textContent=flight.phase==='landing'?'GUIDED ORBITAL CAPTURE':'GUIDED BAY ALIGNMENT / DOCKING';
      $('navDistance').textContent=`CAPTURE ${Math.round(flight.timer/(flight.phase==='docking'?DOCKING_SECONDS:3)*100)}%`;
      $('navHint').textContent=flight.phase==='landing'?'Following a clear arc above Nysa. Descent begins after cloud entry.':'Aligning through the bay entrance. Docking controls are guided.';
    }
    if(flight.phase==='launching')$('flightTelemetry').textContent=`GUIDED DEPARTURE ${Math.round(flight.timer/3*100)}%`;
    if(ground){$('navLabel').textContent=flight.phase==='descending'?'Nysa landing pad':'Nysa departure';$('navDistance').textContent='LANDING GUIDANCE';$('navHint').textContent='Guided vertical flight. The terrain below is your survey sector.';}
    $('flightPad').hidden=flight.phase!=='flying'||flight.leg!=='nysa';$('flightPad').textContent=`PAD: ${flight.site.toUpperCase()}`;$('flightPad').setAttribute('aria-label',`Landing: ${landingPad(flight.site).label}. Switch landing pad with L.`);
    $('flightTarget').textContent=`TARGET: ${flight.leg.toUpperCase()} / T`;return;
  }
  const position=player.translation();
  if(!onSurface&&crewTour){
    const guide=crew.find(c=>c.name==='VEGA')!.body!.translation(),reading=navigationReading(position,yaw,guide);
    $('compassHeading').textContent=`${reading.direction} / ${Math.round(reading.heading)}°`;$('navLabel').textContent=crewTour.phase==='return'?'Vega / returning to bridge':'Follow Vega / station tour';$('navDistance').textContent=`${reading.distance.toFixed(1)} m · ${reading.turn}`;$('navArrow').style.transform=`rotate(${reading.relativeDegrees}deg)`;$('navHint').textContent=crewTour.phase==='stop'?'Speak with Vega for this stop, then choose Continue tour.':crewTour.blocked>=2?'Clear Vega’s path to continue.':crewTour.waiting?'Vega is waiting. Come within six meters.':'Follow Vega; she opens the room bulkheads as she approaches.';$('navigationHud').dataset.destination='crew-tour';$('navigationHud').dataset.waypoint='crew-tour';return;
  }
  if(onSurface&&typeof trackedField==='object'&&Math.hypot(position.x-SURFACE_ORIGIN-trackedField.x,position.z-trackedField.z)<2){trackedField=undefined;notify('SURVEY WAYPOINT REACHED · Mission guidance restored.');}
  const destination=onSurface&&trackedField==='drone'?surveyDrone.waypoint():progress.forged&&!onSurface&&!progress.power.tripped?{id:'launch',label:launchBay.state.inner>.95?'Parked Kestrel':'Runway inner door',x:launchBay.state.inner>.95?LAUNCH_BAY.boarding.x:2.8,z:launchBay.state.inner>.95?LAUNCH_BAY.boarding.z:-17.8,hint:'Open the runway door, walk to the cyan jet marker and board with E.'}:missionDestination(progress,onSurface,trackedField,landingSite,SHIP_LAYOUT);
  const waypoint=onSurface?destination:routeWaypoint(destination,position,doors.map(d=>d.open),SHIP_LAYOUT);
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
  const p=player.translation(),eye=new THREE.Vector3(p.x,p.y+.74,p.z),forward=new THREE.Vector3(0,0,-1).applyEuler(new THREE.Euler(pitch,yaw,0,'YXZ'));
  let selected:Target|undefined,best=2.65;
  for(const t of targets){if((t.zone==='surface')!==onSurface)continue;const direction=t.position.clone().sub(eye),distance=direction.length();
    if(distance<best&&direction.normalize().dot(forward)>.45&&clearSight(world,eye,t.position,playerCollider,t.collider)){selected=t;best=distance;}
  }return selected;
}
function interact(){
 if(!active||dialogueOpen||launchBay.state.boarded)return;
 if(vesperTrip){const result=vesperTrip.interact(yaw,pitch);if(result){if(result.drone){openVesperDrone();return;}if(result.mounted){yaw=0;pitch=vesperTrip.vehicles.riding?.kind==='bike'&&!thirdPerson?-.4:-.1;}if(result.heading!==undefined){yaw=result.heading;pitch=-.15;}if(result.reading&&!progress.vesperReadings.includes(result.reading))progress={...progress,vesperReadings:[...progress.vesperReadings,result.reading]};if(result.archive)progress={...progress,vesperArchived:true};vesperTrip.setProgress(progress.vesperReadings,progress.vesperArchived);save(false);if(result.mounted||result.heading!==undefined||result.archive||result.reading)clearInput();if(result.archive)showDialogue('VESPER / ARCHIVE06',result.message);else notify(result.message);}return;}
 if(riding){if(riding.speed>1){notify('Brake to stop before dismounting.');return;}const p=dismountPosition(world,riding,playerCollider,(x,z)=>terrainHeight(x-SURFACE_ORIGIN,z));if(!p){notify('No clear dismount space. Move to open ground.');return;}yaw=riding.yaw+yaw;avatar.rotation.set(0,riding.yaw+Math.PI,0);riding=null;playerCollider.setEnabled(true);player.setTranslation(p,true);player.setNextKinematicTranslation(p);clearInput();speedDemand=0;return;}
 if(flight){
  if(flight.phase!=='flying')return;
  if(trackedVesper){const blocked=vesperBlock(flight,progress.signalRecovered);if(blocked){notify(blocked);return;}vesperWorld??=new VesperSurface(starfield);vesperWorld.arrive(flight.position,progress.vesperReadings,progress.vesperArchived,pilot,progress.salvage==='delivered',progress.droneRecovered);vesperTrip=vesperWorld;flight=null;flightWorld.hide();trackedVesper=false;clearInput();notify('VESPER / Guided capture, then descent to the frozen basin.');return;}
  if(trackedSignal){const blocked=signalBlock(flight,progress.vault.archived,pilot.yaw,pilot.pitch);if(blocked)notify(blocked);else if(progress.signalRecovered)showDialogue('WAYFINDER / ARCHIVE 05',SIGNAL_ARCHIVE);else if(orbitalScan.begin(flight,progress.vault.archived,pilot.yaw,pilot.pitch))notify('Receiving archive. Keep aligned and below6m/s for three seconds.');return;}
  if(canApproach(flight)){captureViewStart={yaw:pilot.yaw,pitch:pilot.pitch};flight=beginApproach(flight);clearInput();notify(flight.leg==='nysa'?'Guided orbital capture in progress.':'Aligning with the Erebus bay entrance.');}else notify(flight.leg==='erebus'&&flightDistance(flight)<=100&&!inDockingZone(flight.position)?'Approach the front bay beacons or enter the open hangar.':'Reach the approach ring and brake below 18 m/s.');return;
 }
 nearest=selectTarget();nearest?.action();
}
function paintVesperNavigation(){if(!flight)return;const p=flight.position,reading=navigationReading(p,pilot.yaw,VESPER_APPROACH),blocked=vesperBlock(flight,progress.signalRecovered),advice=approachGuidance(flight,pilot.yaw,pilot.pitch,{target:VESPER_APPROACH,range:100,speed:18,ready:!blocked});approachWarning=advice.brakeNow;$('navLabel').textContent='Vesper / frozen basin';$('navDistance').textContent=`${Math.round(reading.distance)}m · ${reading.turn}`;$('compassHeading').textContent=`${reading.direction} / ${Math.round(reading.heading)}°`;$('navArrow').style.transform=`rotate(${reading.relativeDegrees}deg)`;$('navHint').textContent='Near-side approach. Brake below18m/s within100m. E begins guided landing; T restores normal guidance.';$('navigationHud').dataset.destination='flight-vesper';$('flightTelemetry').textContent=`${flightSpeed(flight).toFixed(1)}m/s · VESPER ${Math.round(reading.distance)}m`;$('flightStatus').textContent=advice.brakeNow?'VESPER / BRAKE NOW':blocked??'[ E ] LAND ON VESPER';$('flightPad').hidden=true;$('flightTarget').textContent='TARGET: VESPER / T';}
function leaveVesper(reset=false){if(!vesperTrip)return;vesperTrip.companion.drone.hold();vesperTrip.companion.drone.root.visible=false;vesperTrip.vehicles.reset();avatarVisual?.setBikeFirstPerson(false);avatarVisual?.releaseBikeContact();camera.fov=68;camera.near=.08;camera.updateProjectionMatrix();vesperTrip.craft.visible=false;vesperTrip=null;scene.add(avatar);avatar.visible=false;flightWorld.cockpit.visible=false;flightClouds.style.opacity='0';clearInput();yaw=pitch=0;if(reset){const p={x:SHIP_LAYOUT.spawn.x,y:.9,z:SHIP_LAYOUT.spawn.z};player.setTranslation(p,true);player.setNextKinematicTranslation(p);camera.position.set(p.x,p.y+.74,p.z);camera.rotation.set(0,0,0);scene.add(camera);flight=null;return;}flight={...startFlight('erebus'),phase:'flying',position:{...VESPER_APPROACH},start:{...VESPER_APPROACH},velocity:{x:0,y:0,z:40/3},throttle:40/330};pilot={yaw:Math.PI,pitch:0};speedDemand=flight.throttle;feedback.reset(pilot.yaw);updateHud();notify('VESPER ascent complete. Manual flight restored; Erebus is targeted.');}
$('reset').addEventListener('click',()=>{leaveVesper(true);trackedVesper=false;});
$('touchAction').onclick=interact;
let touchRunning=false;
const movementControls=document.createElement('nav');movementControls.id='movementControls';movementControls.hidden=true;movementControls.setAttribute('aria-label','On-foot movement');movementControls.innerHTML='<button id="touchRun" aria-pressed="false" aria-keyshortcuts="Shift">RUN</button><button id="touchJump" aria-keyshortcuts="Space">JUMP</button>';$('hud').append(movementControls);
const onFoot=()=>active&&!dialogueOpen&&!flight&&!riding&&!launchBay.state.boarded&&(!vesperTrip||vesperTrip.walking&&!vesperTrip.vehicles.riding);
$('touchRun').onclick=()=>{if(!onFoot())return;touchRunning=!touchRunning;$('touchRun').setAttribute('aria-pressed',String(touchRunning));};
$('touchJump').onclick=()=>{if(onFoot())jumpBuffer=JUMP_BUFFER_SECONDS;};

window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)&&active&&!dialogueOpen)e.preventDefault();if(e.code==='Escape'){if(dialogueOpen)closeDialogue();else if(active)pause();return;}if(!active||dialogueOpen)return;if(e.code==='KeyH'&&!e.repeat){$('infoToggle').click();return;}if(e.code==='KeyC'&&!e.repeat){$('cameraToggle').click();return;}if(e.code==='KeyJ'&&!e.repeat){fieldLog.click();return;}if(e.code==='KeyE'&&!e.repeat)interact();if(e.code==='KeyL'&&!e.repeat&&flight)$('flightPad').click();if(e.code==='KeyT'&&!e.repeat&&flight)$('flightTarget').click();if(e.code==='Space'&&!flight&&!riding&&!vesperTrip?.vehicles.riding){if(!e.repeat)jumpBuffer=JUMP_BUFFER_SECONDS;return;}keys.add(e.code);});
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
function clearInput(){vesperTrip?.clearMotion();footstepPace.reset();touchRunning=false;$('touchRun').setAttribute('aria-pressed','false');jumpBuffer=0;flightBrake=flightBoost=false;motionClock.reset();discardMovementFrame=true;velocity.set(0,0,0);keys.clear();touchMove.set(0,0);stickPointer=undefined;lookPointer=undefined;thumb.style.transform='';}
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(innerWidth,innerHeight);}window.addEventListener('resize',resize);
const motionClock=new FixedFrameClock();let discardMovementFrame=true,skipPowerFrame=true,lastMotionSteps=0,motionStepsTotal=0,droppedMotionTime=0;
let verticalSpeed=0,jumpBuffer=0,playerJumping=false;const fixed=FIXED_STEP;const velocity=new THREE.Vector3();
function physicsStep(){
  if(vesperTrip){const run=touchRunning||keys.has('ShiftLeft')||keys.has('ShiftRight'),motion=vesperTrip.step(fixed,{x:(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+touchMove.x,z:(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)+touchMove.y,yaw,run,jump:jumpBuffer>0&&vesperTrip.walking,throttle:(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0),brake:keys.has('Space')||flightBrake});jumpBuffer=0;if(motion.reading&&!progress.vesperReadings.includes(motion.reading)){progress={...progress,vesperReadings:[...progress.vesperReadings,motion.reading]};vesperTrip.setProgress(progress.vesperReadings,progress.vesperArchived);save(false);notify('ECHO / '+VESPER_SITES.find(s=>s.id===motion.reading)!.reading);}avatarBlend=THREE.MathUtils.damp(avatarBlend,Math.min(1,motion.distance/(WALK_SPEED*fixed)),12,fixed);avatarVisual?.update(fixed,motion.distance,avatarBlend,run?1:0,vesperTrip.vehicles.riding?.kind==='bike',motion.jumping,vesperTrip.vertical);const foot=footstepPace.sample(motion.distance,vesperTrip.controller.computedGrounded(),vesperTrip.vertical,fixed,run?1:0,vesperTrip.walking&&!vesperTrip.vehicles.riding&&!!gameAudio&&$<HTMLInputElement>('audio').checked,PLAYER_MOTION_STRIDES);if(foot)gameAudio?.foot(foot,'stone');return;}
  if(!flight&&!onSurface){const p=player.translation(),occupied=(!launchBay.state.boarded&&Math.abs(p.z-LAUNCH_BAY.innerZ)<.6&&Math.abs(p.x)<1.95)||crew.some(c=>Math.abs(c.mesh.position.z-LAUNCH_BAY.innerZ)<.6&&Math.abs(c.mesh.position.x)<1.95);launchBay.state.step(fixed,occupied);launchBay.sync();
    if(launchBay.state.phase==='arrived'){finishBayReturn();return;}
    if(launchBay.state.phase==='away'){launchFlight('nysa',true);playerCollider.setEnabled(true);}
    else if(launchBay.state.boarded){const seat={x:0,y:1.5,z:launchBay.state.jetZ};player.setTranslation(seat,true);player.setNextKinematicTranslation(seat);world.step();return;}
  }
  if(riding){speedDemand=targetThrottle(speedDemand,(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0),fixed);const steer=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)+touchMove.x;const brake=keys.has('Space')||flightBrake;if(brake)speedDemand=Math.max(0,speedDemand-fixed*1.8);riding.step(steer,speedDemand,brake,fixed,playerCollider);avatarVisual?.update(fixed,0,0,0,true);world.step();const p=riding.body.translation();player.setTranslation({x:p.x,y:p.y+VEHICLE_SPEC[riding.kind].seat,z:p.z},true);return;}
  if(flight){
    if(flight.phase==='flying'){pilot=steerPilot(pilot,(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+touchMove.x,(keys.has('ArrowUp')?1:0)-(keys.has('ArrowDown')?1:0)-touchMove.y,fixed);speedDemand=targetThrottle(speedDemand,(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0),fixed);if(keys.has('Space')||flightBrake)speedDemand=Math.max(0,speedDemand-fixed*1.8);}
    const old=flight.collisions,phase=flight.phase;flight=stepFlight(flight,{targetThrottle:speedDemand,throttle:0,brake:keys.has('Space')||flightBrake,boost:keys.has('ShiftLeft')||keys.has('ShiftRight')||flightBoost,yaw:pilot.yaw,pitch:pilot.pitch},fixed);
    if(flight.phase==='descending'&&phase!=='descending'){setLandingSite(flight.site);setSurfaceView(true);notify('NYSA · Cloud break. Landing pad acquired.');}
    if(phase==='ascending'&&flight.phase==='launching'){pilot={yaw:Math.PI,pitch:0};yaw=0;pitch=0;}
    if(flight.collisions>old)notify('Hull safety recovery · thrust cut.');
    const scanning=orbitalScan.active;if(trackedSignal&&orbitalScan.step(flight,progress.vault.archived,pilot.yaw,pilot.pitch,fixed)){progress={...progress,signalRecovered:true};orbitalProbe.setRecovered(true);save();tone(830);notify('ARCHIVE 05 recovered. Read it in FIELD LOG / J.');}else if(scanning&&!orbitalScan.active)notify('Scan interrupted: '+orbitalScan.reason);
    if(flight.phase==='landed'||flight.phase==='docked'){const landing=flight.phase==='landed';flight=null;flightWorld.hide();if(landing)travel(true);else beginBayReturn();}return;
  }
  for(const d of doors){const occupied=[player.translation(),...crew.map(c=>c.body!.translation())].some(p=>Math.abs(p.x-d.x)<.9&&Math.abs(p.z-SHIP_LAYOUT.doorZ)<1.3);if(!d.open&&occupied)d.open=true;d.progress=THREE.MathUtils.damp(d.progress,d.open?1:0,5,fixed);d.mesh.position.y=1.6+d.progress*3.7;d.collider?.setTranslation({x:d.x,y:d.mesh.position.y,z:SHIP_LAYOUT.doorZ});}
  const input=new THREE.Vector2((keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+touchMove.x,(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)+touchMove.y);if(input.length()>1)input.normalize();
  const speed=touchRunning||keys.has('ShiftLeft')||keys.has('ShiftRight')?RUN_SPEED:WALK_SPEED;const desired=new THREE.Vector3(input.x,0,input.y).applyAxisAngle(new THREE.Vector3(0,1,0),yaw).multiplyScalar(speed);velocity.lerp(desired,1-Math.exp(-12*fixed));
  const grounded=controller.computedGrounded(),jump=stepJumpBuffer(jumpBuffer,grounded);jumpBuffer=jump.remaining;
  if(jump.jump)playerJumping=true;if(grounded)verticalSpeed=jump.jump?JUMP_SPEED:-.2;else verticalSpeed-=9.81*fixed;
  controller.computeColliderMovement(playerCollider,{x:velocity.x*fixed,y:verticalSpeed*fixed,z:velocity.z*fixed});const m=controller.computedMovement(),p=player.translation();player.setNextKinematicTranslation({x:p.x+m.x,y:p.y+m.y,z:p.z+m.z});if(!onSurface)stepCrew();world.step();if(!onSurface)syncCrew();
  if(controller.computedGrounded()&&!jump.jump)playerJumping=false;const actual=player.translation(),distance=Math.hypot(actual.x-p.x,actual.z-p.z);avatarGait+=distance/1.313094*Math.PI*2;avatarBlend=THREE.MathUtils.damp(avatarBlend,Math.min(1,distance/(WALK_SPEED*fixed)),12,fixed);avatarVisual?.update(fixed,distance,avatarBlend,Math.min(1,Math.max(0,(distance/fixed-WALK_SPEED)/(RUN_SPEED-WALK_SPEED))),false,playerJumping||(!controller.computedGrounded()&&(actual.y-p.y)/fixed<-.8),verticalSpeed);
  if(distance>.0001)avatar.rotation.y=turnToward(avatar.rotation.y,Math.atan2(actual.x-p.x,actual.z-p.z),fixed);
  avatarLegs.forEach((leg,i)=>leg.rotation.x=Math.sin(avatarGait+i*Math.PI)*.35*avatarBlend);
  const foot=footstepPace.sample(distance,controller.computedGrounded(),verticalSpeed,fixed,Math.min(1,Math.max(0,(distance/fixed-WALK_SPEED)/(RUN_SPEED-WALK_SPEED))),!!gameAudio&&$<HTMLInputElement>('audio').checked,avatar.userData.requested==='biker'?PLAYER_MOTION_STRIDES:CREW_MOTION_STRIDES);
  if(foot)gameAudio?.foot(foot,footSurface());
  if(player.translation().y< -4){const pad=landingPad(landingSite),spawn=onSurface?{x:SURFACE_ORIGIN+pad.x-3.8,y:terrainHeight(pad.x-3.8,pad.z+2)+1.05,z:pad.z+2}:{x:SHIP_LAYOUT.spawn.x,y:.9,z:SHIP_LAYOUT.spawn.z};player.setTranslation(spawn,true);player.setNextKinematicTranslation(spawn);clearInput();verticalSpeed=0;}
}
const clock=new THREE.Clock();let frames=0,fpsTime=0;
function frame(){requestAnimationFrame(frame);movementControls.hidden=!onFoot();const rawDt=clock.getDelta(),dt=Math.min(rawDt,MAX_FRAME_SECONDS);elapsed+=dt;toastTimer-=Math.min(rawDt,1);
  const movementDt=discardMovementFrame?0:rawDt,powerDt=skipPowerFrame?0:rawDt;discardMovementFrame=false;skipPowerFrame=false;lastMotionSteps=0;if(toastTimer<=0)$('toast').style.opacity='0';
  if(active)advancePower(Math.min(powerDt,MAX_FRAME_SECONDS));powerVisuals();
  if(vesperTrip){
    const trip=vesperTrip;trip.companion.present(dt,trip.walking,active&&!dialogueOpen);if(active&&!dialogueOpen){const budget=motionClock.advance(movementDt);lastMotionSteps=budget.steps;motionStepsTotal+=budget.steps;droppedMotionTime+=budget.dropped;for(let i=0;i<budget.steps;i++)physicsStep();}
    if(trip.phase==='done'){leaveVesper();return;}
    avatarVisual?.setBikeFirstPerson(false);avatarVisual?.releaseBikeContact();avatarVisual?.releaseFootContact();camera.fov=68;camera.near=.08;camera.updateProjectionMatrix();
    const targetScene=trip.present(camera,avatar,yaw,pitch,thirdPerson,flightWorld.scene);renderPass.scene=targetScene;if(camera.parent!==targetScene)targetScene.add(camera);if(targetScene===flightWorld.scene)sharedSpace.present(targetScene,camera.position);
    if(trip.walking)trip.vehicles.present(active&&!dialogueOpen?dt:0,camera,avatar,avatarVisual,yaw,pitch,thirdPerson,trip.contact);flightWorld.cockpit.visible=!trip.walking&&!thirdPerson;flightWorld.cockpit.quaternion.identity();
    const reading=navigationReading(trip.player.translation(),yaw+(trip.vehicles.riding?.yaw??0),trip.guidance().point),visible=informationVisible&&active&&!dialogueOpen;
    $('location').textContent='VESPER / FROZEN BASIN';$('coordinates').textContent=`LOCAL / X ${trip.player.translation().x.toFixed(1)} · Z ${trip.player.translation().z.toFixed(1)}`;$('objective').textContent=trip.walking?'Survey Vesper':'Kestrel / '+trip.phase;$('missionText').textContent=`${progress.vesperReadings.length}/2 readings · ${progress.vesperArchived?'Archive06 secured. Return to Kestrel.':'Survey frost and warmth, then recover the basin archive.'}`;
    $('navigationHud').hidden=!visible;$('compassHeading').textContent=`${reading.direction} / ${Math.round(reading.heading)}°`;$('navLabel').textContent=trip.guidance().label;$('navDistance').textContent=reading.distance.toFixed(1)+'m';$('navArrow').style.transform=`rotate(${reading.relativeDegrees}deg)`;$('navHint').textContent=trip.vehicles.riding?'Left slider: speed. Right joystick: steering; look independently. Brake then E to dismount.':'E scans, rides nearby vehicles and boards the parked jet. You can return at any time.';$('navigationHud').dataset.destination='vesper-surface';fieldLog.hidden=!visible||!trip.walking||!!trip.vehicles.riding;fieldLog.textContent=`VESPER FIELD LOG / J · ${progress.vesperReadings.length}/2`;
    const vehicle=trip.vehicles.riding,controls=active&&!dialogueOpen&&!!vehicle;$('hud').classList.toggle('piloting',!!vehicle);flightHud.hidden=speedControl.hidden=!controls;speedSlider.disabled=!controls;speedSlider.value=String(Math.round(trip.vehicles.demand*100));$('speedPercent').textContent=speedSlider.value+'%';$('flightBrake').hidden=false;$('flightTarget').hidden=$('flightPad').hidden=$('flightBoost').hidden=true;if(vehicle){$('flightTelemetry').textContent=vehicle.kind.toUpperCase()+' · '+vehicle.speed.toFixed(1)+' m/s';$('flightStatus').textContent='BRAKE then E to dismount';}velocityMarker.hidden=true;const prompt=active&&!dialogueOpen?trip.prompt(yaw,pitch):'';$('interaction').style.display=prompt?'block':'none';$('interaction').textContent='[ E ] '+prompt;$('touchAction').setAttribute('aria-label',prompt||'Interact');$('crosshair').hidden=thirdPerson;
    const cloud=trip.phase==='capture'?Math.max(0,(trip.timer-2.4)/.6):trip.phase==='descent'?Math.max(0,1-trip.timer/.6):trip.phase==='ascent'?Math.max(0,(trip.timer-6.4)/.6):trip.phase==='departure'?Math.max(0,1-trip.timer/.6):0;flightClouds.style.opacity=String(cloud*.96);
    if(active&&gameAudio&&$<HTMLInputElement>('audio').checked)gameAudio.update({location:trip.walking?'surface':'flight',vehicle:vehicle?.kind??(trip.walking?null:'shuttle'),speed:vehicle?vehicle.speed/vehicle.maxSpeed:trip.walking?0:.3,demand:vehicle?trip.vehicles.demand:trip.walking?0:.45,brake:keys.has('Space')||flightBrake,boost:false,tripped:progress.power.tripped});
    camera.updateMatrixWorld();if(bloom.enabled)composer.render();else renderer.render(targetScene,camera);frames++;fpsTime+=rawDt;if(fpsTime>2){canvas.dataset.fps=String(Math.round(frames/fpsTime));frames=0;fpsTime=0;}return;
  }
  if(active&&!dialogueOpen){const budget=motionClock.advance(movementDt);lastMotionSteps=budget.steps;motionStepsTotal+=budget.steps;droppedMotionTime+=budget.dropped;for(let i=0;i<budget.steps;i++){physicsStep();if(onSurface&&!flight){signalVault.update(fixed,true);const scanned=surveyDrone.step(world,player.translation(),playerCollider,fixed,!riding);if(scanned){const visible=availableDroneScan();if(visible===scanned){progress=recordFieldScan(progress,scanned);surface.setScans(progress.fieldScans);save();tone(740);notify('ECHO / Reading recorded: '+FIELD_SITES.find(s=>s.id===scanned)!.label);}else notify('ECHO / Scan interrupted: receiver out of range or occluded.');}}}const p=player.translation();const moving=velocity.length();
    if(!onSurface&&!flight&&Math.hypot(p.x+6.3,p.z+4.4)<7)void reserveCartridges.load();
    for(const [kind,v] of groundVehicles){const mesh=vehicleVisuals.get(kind)!;const pos=v.body.translation();let stance=vehicleStances.get(kind);if(!stance){stance=new VehicleStance();vehicleStances.set(kind,stance);}const groundLocal=(x:number,z:number)=>(onSurface?v.supportHeight(SURFACE_ORIGIN+x,z,playerCollider):undefined)??vehicleGround(x,z);stance.update(kind,mesh,pos.x-SURFACE_ORIGIN,pos.y,pos.z,v.yaw,groundLocal,dt,v.turnRate,v.speed);let suspension=suspensions.get(kind);if(!suspension){suspension=new VehicleSuspension(kind);suspensions.set(kind,suspension);}
      if(kind==='rover'&&mesh.userData.requested){const wheels:THREE.Object3D[]=(mesh.userData.wheels??= ['FrontLeft','FrontRight','RearLeft','RearRight'].map(side=>mesh.getObjectByName('Rover_Wheel_'+side)).filter(Boolean));for(const wheel of wheels){const front=wheel.name.includes('Front'),steer=front?THREE.MathUtils.clamp(Math.atan(v.turnRate*2.62/Math.max(v.speed,1)),-.45,.45):0;wheel.rotation.set(-v.distance/(front?.398:.501),0,0);const knuckle=mesh.getObjectByName(wheel.name.replace('Rover_Wheel_','Rover_Knuckle_'));if(knuckle)knuckle.rotation.y=steer;}}
      if(onSurface)suspension.update(mesh,(x,z)=>v.supportHeight(x,z,playerCollider)??vehicleGround(x-SURFACE_ORIGIN,z),dt);
      if(kind==='bike'){if(turboFeedback.root.parent!==mesh)mesh.add(turboFeedback.root);turboFeedback.update(riding===v,onSurface&&thirdPerson&&mesh.userData.requested==='bike',keys.has('Space')||flightBrake,speedDemand,v.speed,dt);turboFeedback.root.position.y=.409+suspension.podOffset;}
      const t=vehicleTargets.get(kind)!;t.position.set(pos.x+Math.cos(v.yaw)*(VEHICLE_SPEC[kind].half[0]+.4),pos.y+.4,pos.z-Math.sin(v.yaw)*(VEHICLE_SPEC[kind].half[0]+.4));}
    if(flight){flightWorld.update(flight,dt,approachWarning,trackedVesper&&flight.phase==='flying'?{target:VESPER_APPROACH,ready:!vesperBlock(flight,progress.signalRecovered)}:trackedSignal&&flight.phase==='flying'?{target:WAYFINDER,ready:!signalBlock(flight,progress.vault.archived,pilot.yaw,pilot.pitch)}:undefined);
      if(flight.phase==='landing'||flight.phase==='docking'){const look=captureLook(flight.position,flight.leg),blend=THREE.MathUtils.smoothstep(flight.timer,0,.8);yaw=captureViewStart.yaw+Math.atan2(Math.sin(look.yaw-captureViewStart.yaw),Math.cos(look.yaw-captureViewStart.yaw))*blend;pitch=captureViewStart.pitch+(look.pitch-captureViewStart.pitch)*blend;pilot={yaw,pitch};yaw=0;pitch=0;}
      camera.rotation.set(pilot.pitch+pitch,pilot.yaw+yaw,0);
      if(isSurfaceFlight(flight)){const pose=surfaceFlightPose(flight.timer,flight.phase==='ascending',flight.site);camera.position.set(SURFACE_ORIGIN+pose.position.x,pose.position.y,pose.position.z);camera.rotation.set(pose.pitch,pose.yaw,0);$('location').textContent=flight.phase==='descending'?'NYSA / DESCENT':'NYSA / ASCENT';$('coordinates').textContent=`RADAR ALT ${pose.altitude.toFixed(1)} m`;$('flightTelemetry').textContent=`RADAR ALT ${pose.altitude.toFixed(1)} m · ${Math.round(pose.progress*100)}%`;}
      else {$('location').textContent='KESTREL / FREE FLIGHT';$('coordinates').textContent=`SECTOR / X ${flight.position.x.toFixed(0)} · Y ${flight.position.y.toFixed(0)} · Z ${flight.position.z.toFixed(0)}`;}nearest=undefined;}
    else {camera.position.set(p.x,p.y+.74+Math.sin(elapsed*9)*.018*Math.min(moving,1),p.z);camera.rotation.set(pitch,yaw,0);$('location').textContent=onSurface?`NYSA / SURVEY SITE · ${landingPad(landingSite).label.toUpperCase()}`:p.x< -SHIP_LAYOUT.roomBoundary?'ENGINEERING':p.x>SHIP_LAYOUT.roomBoundary?'OBSERVATORY':p.z<LAUNCH_BAY.innerZ?'KESTREL / LAUNCH RUNWAY':p.z< -5?'COMMAND DECK':'HABITAT CONCOURSE';$('coordinates').textContent=`${onSurface?'SURFACE':'SECTOR 00.00'} / X ${(p.x-(onSurface?SURFACE_ORIGIN:0)).toFixed(1)} · Z ${p.z.toFixed(1)}`;nearest=riding?undefined:selectTarget();}
    if(flight)feedback.step(flight,pilot.yaw,keys.has('Space')||flightBrake,keys.has('ShiftLeft')||keys.has('ShiftRight')||flightBoost,dt);
    updatePlayerView();
    const prompt=launchBay.state.boarded?'':riding?'[ E ] Stop and dismount':flight?(trackedVesper?(flight.phase==='flying'&&!vesperBlock(flight,progress.signalRecovered)?'[ E ] Land on Vesper':''):trackedSignal?(flight.phase==='flying'&&!signalBlock(flight,progress.vault.archived,pilot.yaw,pilot.pitch)?'[ E ] '+(progress.signalRecovered?'Read Archive 05':'Scan Wayfinder'):''):canApproach(flight)?`[ E ] ${flight.leg==='nysa'?'Land on Nysa':'Dock with Erebus'}`:''):nearest?`[ E ] ${nearest.name}`:'';$('interaction').style.display=prompt?'block':'none';$('interaction').textContent=prompt;$('touchAction').setAttribute('aria-label',prompt||'Interact');
  }else{$('interaction').style.display='none';}
  if(active&&gameAudio&&$<HTMLInputElement>('audio').checked){
    const boarded=launchBay.state.boarded,brake=keys.has('Space')||flightBrake;
    const guided=boarded&&['departing','return-turn','return-parking'].includes(launchBay.state.phase);
    gameAudio.update({location:flight?'flight':onSurface?'surface':'ship',vehicle:flight||boarded?'shuttle':riding?.kind??null,speed:riding?Math.abs(riding.speed)/riding.maxSpeed:flight?flightSpeed(flight)/110:0,demand:dialogueOpen?0:riding?speedDemand:flight?feedback.power:guided?.55:0,brake,boost:!!flight&&(keys.has('ShiftLeft')||keys.has('ShiftRight')||flightBoost),tripped:progress.power.tripped});
  }
  navigationTimer+=rawDt;if(navigationTimer>=.1){paintNavigation();navigationTimer=0;}
  for(let i=0;i<rings.length;i++){rings[i].rotation.z+=dt*.035*(i%2?-1:1);rings[i].rotation.y+=dt*.012;}pylons.rotation.z=elapsed*.018;shell.rotation.y=elapsed*.06;forgeBody.rotation.y=elapsed*.03;forgeLight.scale.setScalar(.96+Math.sin(elapsed*1.4)*.04+(progress.forged?.12:0));chart.rotation.y=elapsed*.15;reactorCore.rotation.y=elapsed*.25;planet.rotation.y=elapsed*.008;clouds.rotation.y=elapsed*.015;clouds.visible=planet.visible;
  if(dialogueOpen&&speakingCrew){const c=crew.find(c=>c.name===speakingCrew)!;const p=player.translation();c.mesh.rotation.y=turnToward(c.mesh.rotation.y,Math.atan2(p.x-c.mesh.position.x,p.z-c.mesh.position.z),dt);}
  lightBudget.configure($<HTMLSelectElement>('quality').value==='high',!onSurface&&!flight);lightBudget.update(camera.position,dt);
  const groundFlight=flight&&isSurfaceFlight(flight);
  renderPass.scene=flight&&!groundFlight?flightWorld.scene:scene;
  if(camera.parent!==renderPass.scene)renderPass.scene.add(camera);
  sharedSpace.present(renderPass.scene,camera.position);
  landedShuttle.visible=!groundFlight;flightClouds.style.opacity=String(flight?cloudOpacity(flight):0);camera.updateMatrixWorld();
  surface.rockScenery.update(new THREE.Vector3(camera.position.x-SURFACE_ORIGIN,camera.position.y,camera.position.z),$<HTMLSelectElement>('quality').value==='high',surface.group.visible);
  surface.plants.update(dt,active&&!dialogueOpen&&surface.group.visible);
  const roverActor=vehicleVisuals.get('rover');if(roverActor)roverSalvage.attach(roverActor);
  surveyDrone.root.visible=onSurface&&!flight;surveyDrone.animate(dt,active&&!dialogueOpen&&onSurface&&!flight);
  signalVault.update(0,false,camera.position);surface.pond.update(dt,active&&!dialogueOpen&&surface.group.visible);relayOutpost.update(dt,active&&!dialogueOpen&&surface.group.visible,camera.position);
  surface.contact.clear();
  if(surface.group.visible){
    for(const [i,rock]of surface.rockScenery.contacts().entries())surface.contact.updateRock(i,rock.x+SURFACE_ORIGIN,rock.z,rock.width,rock.depth);
    // World X/Z matches shader fragments; height follows the actual render mesh.
    surface.contact.update('player',{x:avatar.position.x,y:avatar.position.y,z:avatar.position.z,yaw:avatar.rotation.y,visible:avatar.visible&&!riding},vehicleGround(avatar.position.x-SURFACE_ORIGIN,avatar.position.z));
    for(const [kind,mesh] of vehicleVisuals)surface.contact.update(kind,{x:SURFACE_ORIGIN+mesh.position.x,y:mesh.position.y,z:mesh.position.z,yaw:groundVehicles.get(kind)!.yaw,visible:mesh.visible},vehicleGround(mesh.position.x,mesh.position.z));
    const craft=groundFlight?surfaceCraft:landedShuttle,offset=groundFlight?0:SURFACE_ORIGIN;
    surface.contact.update('shuttle',{x:craft.position.x+offset,y:craft.position.y,z:craft.position.z,yaw:craft.rotation.y,visible:craft.visible},vehicleGround(craft.position.x+offset-SURFACE_ORIGIN,craft.position.z));
  }
  velocityMarker.hidden=true;
  if(active&&!dialogueOpen&&flight?.phase==='flying'&&flightSpeed(flight)>1){
    const v=flight.velocity,speed=flightSpeed(flight);camera.getWorldDirection(velocityForward);
    if(v.x*velocityForward.x+v.y*velocityForward.y+v.z*velocityForward.z>0){
      projectedVelocity.set(flight.position.x+v.x/speed*100,flight.position.y+v.y/speed*100,flight.position.z+v.z/speed*100).project(camera);
      if(Math.abs(projectedVelocity.x)<.9&&projectedVelocity.y>-.65&&projectedVelocity.y<.7){velocityMarker.hidden=false;velocityMarker.style.left=`${(projectedVelocity.x*.5+.5)*innerWidth}px`;velocityMarker.style.top=`${(-projectedVelocity.y*.5+.5)*innerHeight}px`;}
    }
  }
  if(bloom.enabled)composer.render();else renderer.render(renderPass.scene,camera);frames++;fpsTime+=rawDt;if(fpsTime>2){canvas.dataset.fps=String(Math.round(frames/fpsTime));frames=0;fpsTime=0;}
}
function updatePlayerView(){
  avatarVisual?.setBikeFirstPerson(false);
  const firstBike=riding?.kind==='bike'&&!thirdPerson,fov=firstBike?bikeViewFov(camera.aspect):68,near=firstBike?.02:.08;if(camera.fov!==fov||camera.near!==near){camera.fov=fov;camera.near=near;camera.updateProjectionMatrix();}
  avatarVisual?.releaseFootContact();
  if(launchBay.state.boarded){
    avatar.visible=false;flightWorld.cockpit.visible=!thirdPerson;surfaceCraft.visible=false;launchBay.jet.visible=thirdPerson;
    const jet=launchBay.jet,heading=launchBay.state.jetYaw,eye=jet.position.clone().add(new THREE.Vector3(0,SHUTTLE_EYE_HEIGHT,0));
    camera.position.copy(eye);camera.rotation.set(pitch,heading+yaw,0);
    flightWorld.cockpit.quaternion.copy(camera.quaternion).invert().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0,heading,0)));
    if(thirdPerson){const pose=flightCamera(eye,new THREE.Euler(pitch,heading+yaw,0,'YXZ'),(a,b)=>surfaceCameraDistance(world,a,b,playerCollider,launchBay.hull!));camera.position.copy(pose.position);camera.lookAt(pose.target);cameraClearance=pose.distance;}return;
  }

  if(riding?.kind!=='bike')avatarVisual?.releaseBikeContact();
  avatar.visible=false;surfaceCraft.visible=false;flightWorld.craft.visible=false;orbitalThrusters.root.visible=surfaceThrusters.root.visible=false;
  if(flight){
    flightWorld.cockpit.visible=!thirdPerson;
    const origin=camera.position.clone(),rotation=camera.rotation.clone(),ground=isSurfaceFlight(flight);
    flightWorld.cockpit.quaternion.copy(camera.quaternion).invert().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(ground?rotation.x:pilot.pitch,ground?rotation.y:pilot.yaw,0,'YXZ')));
    const craft=ground?surfaceCraft:flightWorld.craft;
    craft.position.copy(origin);craft.position.y-=SHUTTLE_EYE_HEIGHT;craft.rotation.set(ground?0:pilot.pitch,ground?rotation.y:pilot.yaw,0);craft.visible=thirdPerson;
    if(ground){craft.rotation.set(0,rotation.y,0);rotation.set(-.08,rotation.y,0);}else craft.rotation.z+=feedback.bank;
    if(thirdPerson){
      const pose=flightCamera(origin,rotation,ground?(from,to)=>surfaceCameraDistance(world,from,to,playerCollider,parkedShuttleCollider,extractionTarget.collider):orbitalCameraDistance);
      camera.position.copy(pose.position);camera.lookAt(pose.target);cameraClearance=pose.distance;
      if(pose.distance<3)craft.visible=false;
    }
    (ground?surfaceThrusters:orbitalThrusters).update(craft,feedback.power,feedback.time,ground);
  }else{
    flightWorld.hide();
    const p=player.translation();avatar.position.set(p.x,p.y-.85,p.z);
    avatar.rotation.x=avatar.rotation.z=0;
    if(riding){
      const mesh=vehicleVisuals.get(riding.kind)!;mesh.updateWorldMatrix(true,false);
      camera.position.copy(mesh.localToWorld(riding.kind==='bike'&&!thirdPerson?BIKE_EYE.clone():new THREE.Vector3(0,VEHICLE_SPEC[riding.kind].half[1]+1.2,0)));camera.rotation.set(pitch,riding.yaw+yaw,0);
      avatar.visible=riding.kind==='bike';
      const contactRider=riding.kind==='bike'&&avatar.userData.requested==='biker'&&mesh.userData.requested==='bike';
      avatar.position.copy(mesh.localToWorld(contactRider?BIKE_RIDER_SEAT.clone():new THREE.Vector3(0,VEHICLE_SPEC[riding.kind].seat-.9,.43)));
      mesh.getWorldQuaternion(avatar.quaternion);avatar.rotateY(Math.PI);
      if(contactRider){avatarVisual?.fitBikeContact(mesh);avatarVisual?.setBikeFirstPerson(!thirdPerson);if(!thirdPerson){avatarVisual?.bikeEye(camera.position);camera.rotation.set(pitch+mesh.rotation.x,riding.yaw+yaw,mesh.rotation.z,'YXZ');}}
      if(thirdPerson){const pose=flightCamera(camera.position,new THREE.Euler(pitch,riding.yaw+yaw,0,'YXZ'),(a,b)=>surfaceCameraDistance(world,a,b,playerCollider,riding!.collider));camera.position.copy(pose.position);camera.lookAt(pose.target);cameraClearance=pose.distance;}return;
    }
    if(thirdPerson){
      const eye=new THREE.Vector3(p.x,p.y+.74,p.z),pose=walkingCamera(world,eye,yaw,pitch,playerCollider);
      camera.position.copy(pose.position);camera.lookAt(pose.target);cameraClearance=pose.distance;avatar.visible=pose.distance>.8;
      if(avatar.visible&&onSurface&&!playerJumping&&controller.computedGrounded())avatarVisual?.fitFootContact((x,z)=>vehicleGround(x-SURFACE_ORIGIN,z));
    }
  }
  $('crosshair').hidden=thirdPerson;
}
async function boot(){await RAPIER.init();world=new RAPIER.World({x:0,y:-9.81,z:0});world.timestep=fixed;
  relayOutpost.init(world);networkTargets.forEach((t,i)=>t.collider=relayOutpost.terminals[i].collider);surface.setRelayOnline(progress.network.online);
  roverSalvage.init(world);salvageTargets.forEach((t,i)=>t.collider=roverSalvage.sites[i].collider);
  signalVault.init(world);vaultTargets.forEach((t,i)=>t.collider=signalVault.terminals[i].collider);
  cacheTarget.collider=world.createCollider(RAPIER.ColliderDesc.cuboid(CACHE_SIZE.width/2,cachePlan.colliderHalfHeight,CACHE_SIZE.depth/2).setTranslation(SURFACE_ORIGIN+SUPPLY_CACHE.x,cachePlan.colliderY,SUPPLY_CACHE.z));
  surfaceTerrainCollider=world.createCollider(RAPIER.ColliderDesc.trimesh(surface.mesh.vertices,surface.mesh.indices).setTranslation(SURFACE_ORIGIN,0,0));
  for(const axis of ['x','z'])for(const sign of [-1,1])world.createCollider(RAPIER.ColliderDesc.cuboid(axis==='x'?1:SITE_HALF+1,4,axis==='z'?1:SITE_HALF+1).setTranslation(SURFACE_ORIGIN+(axis==='x'?sign*(SITE_HALF+1):0),2,axis==='z'?sign*(SITE_HALF+1):0));
  extractionTarget.collider=world.createCollider(RAPIER.ColliderDesc.cuboid(.16,1.2,.16).setTranslation(SURFACE_ORIGIN,1.2,LANDING.z+SHUTTLE_HATCH_Z));
  parkedShuttleCollider=world.createCollider(RAPIER.ColliderDesc.cuboid(SHUTTLE_SIZE[0]/2,SHUTTLE_SIZE[1]/2,SHUTTLE_SIZE[2]/2).setTranslation(SURFACE_ORIGIN,SHUTTLE_SIZE[1]/2,LANDING.z));
  sampleTarget.collider=world.createCollider(RAPIER.ColliderDesc.ball(.6).setTranslation(SURFACE_ORIGIN+SAMPLE.x,terrainHeight(SAMPLE.x,SAMPLE.z)+.45,SAMPLE.z));
  for(const rock of surface.obstacles)createRockCollider(world,rock);
  for(const b of surface.landmarkBoxes)world.createCollider(RAPIER.ColliderDesc.cuboid(b.size[0]/2,b.size[1]/2,b.size[2]/2).setTranslation(SURFACE_ORIGIN+b.x,b.y,b.z));
  surface.scanners.forEach((s,i)=>{fieldTargets[i].collider=world.createCollider(RAPIER.ColliderDesc.cuboid(s.size[0]/2,s.size[1]/2,s.size[2]/2).setTranslation(s.position.x,s.position.y-.45,s.position.z));});
  for(const [index,s] of solids.entries()){const collider=world.createCollider(RAPIER.ColliderDesc.cuboid(s.size[0]/2,s.size[1]/2,s.size[2]/2).setTranslation(s.pos[0],s.pos[1],s.pos[2]));if(s.target)s.target.collider=collider;if(index>=structureStart&&index<structureEnd)structuralColliders.push(collider);}for(const d of doors)d.collider=world.createCollider(RAPIER.ColliderDesc.cuboid(.14,1.6,.975).setTranslation(d.x,1.6,SHIP_LAYOUT.doorZ));player=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(SHIP_LAYOUT.spawn.x,.9,SHIP_LAYOUT.spawn.z));playerCollider=world.createCollider(RAPIER.ColliderDesc.capsule(PLAYER_SHAPE.halfHeight,PLAYER_SHAPE.radius),player);controller=world.createCharacterController(PLAYER_SHAPE.offset);controller.enableAutostep(PLAYER_SHAPE.stepHeight,PLAYER_SHAPE.stepWidth,true);controller.enableSnapToGround(.2);controller.setMaxSlopeClimbAngle(Math.PI/4);
  for(const c of crew){
    c.body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(c.mesh.position.x,.94,c.mesh.position.z));
    c.collider=world.createCollider(RAPIER.ColliderDesc.capsule(.67,.24),c.body);c.target.collider=c.collider;
    c.controller=world.createCharacterController(.015);c.controller.enableSnapToGround(.2);c.controller.enableAutostep(.25,.2,true);
  }
  world.step(); // Populate collision queries before the first interaction/sight sample.
  for(const kind of ['bike','rover'] as const){const pad=landingPad(landingSite),x=pad.x+(kind==='bike'?7:-8),z=pad.z+7;const v=new GroundVehicle(kind,world,{x:SURFACE_ORIGIN+x,y:terrainHeight(x,z),z});v.driveCalibrated=kind==='rover'&&progress.salvage==='delivered';groundVehicles.set(kind,v);const mesh=new THREE.Group();surface.group.add(mesh);vehicleVisuals.set(kind,mesh);const material=new THREE.MeshStandardMaterial({color:kind==='bike'?0x77644a:0x91a8a5,metalness:.6,roughness:.5});const h=VEHICLE_SPEC[kind].half;const hull=new THREE.Mesh(new THREE.BoxGeometry(h[0]*2,h[1],h[2]*2),material);hull.position.y=h[1];mesh.add(hull);const t:Target={zone:'surface',name:kind==='bike'?'Ride Turbo Bike':'Drive Sci-fi Rover',position:new THREE.Vector3(),collider:v.collider,action:()=>{riding=v;playerCollider.setEnabled(false);clearInput();speedDemand=0;yaw=0;pitch=kind==='bike'&&!thirdPerson?-.4:-.1;notify('Left slider: speed. Right joystick: steering. Brake, then E to dismount.');}};vehicleTargets.set(kind,t);targets.push(t);}
  try{
    const root=await attachRequested('interior',deck);if(root){const colliders=meshColliders(world,root);if(!colliders.length)throw Error('Empty station collision');for(const c of structuralColliders)world.removeCollider(c,true);deckFallback.visible=false;}
  }catch{deckFallback.visible=true;console.warn('Station interior unavailable; fitted fallback retained');}
  try{const root=await attachRequested('bedroom',cabin);if(root){clearCabinGlazing(root);meshColliders(world,root);cabinLoaded=true;const resident=new THREE.Group();resident.scale.setScalar(1.12);const bedHit=world.castRay(new RAPIER.Ray({x:0,y:2,z:cabin.position.z+3.2},{x:0,y:-1,z:0}),2,true);resident.position.set(0,bedHit?2-bedHit.timeOfImpact+.015:.9,3.2);cabin.add(resident);await attachRequested('resident',resident);cabin.userData.resident=true;}}catch{console.warn('Crew cabin unavailable');}
  const runwayRoot=await runwayReady;if(runwayRoot)meshColliders(world,runwayRoot);
  runwayShellColliders(world);
  launchBay.init(world);launchBay.sync();boardJetTarget.collider=launchBay.hull;world.step();syncCrew();updateHud();paintPower();$('loading').textContent='Systems ready · progress saves on this device';$('play').removeAttribute('disabled');canvas.dataset.ready='true';frame();}
if(matchMedia('(pointer:coarse)').matches || new URLSearchParams(location.search).has('qa')){$<HTMLSelectElement>('quality').value='low';renderer.setPixelRatio(1);renderer.shadowMap.enabled=false;bloom.enabled=false;surface.setQuality(false);resize();}
$('play').setAttribute('disabled','');boot().catch(()=>{$('loading').textContent='Physics initialization failed. Refresh to retry.';});
// Explicit development-only observability; stripped from the static production build.
if(import.meta.env.DEV && new URLSearchParams(location.search).has('qa')){
  Object.assign(window,{__erebus:{snapshot:()=>({vesper:vesperTrip?.snapshot()??null,launchBay:launchBay.state.snapshot(),parkedJet:launchBay.jet.visible,position:player?.translation(),camera:{x:camera.position.x,y:camera.position.y,z:camera.position.z,clearance:cameraClearance,thirdPerson},avatar:{source:avatar.userData.requested??'ely',visible:avatar.visible,visual:avatarVisual?.snapshot()??null,position:avatar.position.toArray()},feedback:{power:feedback.power,bank:feedback.bank,time:feedback.time,orbitalVisible:orbitalThrusters.root.visible,surfaceVisible:surfaceThrusters.root.visible},authored:{interior:deck.userData.requested==='interior',cabin:cabinLoaded,resident:!!cabin.userData.resident,cockpit:flightWorld.cockpit.userData.requested==='cockpit',vehicles:[...vehicleVisuals].filter(([,m])=>!!m.userData.requested).map(([kind])=>kind),craft:!!landedShuttle.userData.authored,station:!!flightWorld.habitat.userData.authored,flightCraftVisible:flightWorld.craft.visible,surfaceCraftVisible:surfaceCraft.visible},surfaceView:surface.group.visible,shuttleVisible:landedShuttle.visible,cockpitVisible:flightWorld.cockpit.visible,shipHidden:shipVisibility.size>0,onSurface,landingSite,parked:{mesh:landedShuttle.position.toArray(),hull:parkedShuttleCollider.translation(),hatch:extractionTarget.collider?.translation()},flight:flight?{...flight,speed:flightSpeed(flight),distance:flightDistance(flight)}:null,pilot:{...pilot},speedDemand,riding:riding?.kind??null,vehicles:[...groundVehicles.values()].map(v=>v.snapshot()),progress,surfaceMaterials:surface.materialSnapshot(),outpost:relayOutpost.snapshot(),vault:signalVault.snapshot(),salvage:roverSalvage.snapshot(),drone:surveyDrone.snapshot(),timing:{lastMotionSteps,motionStepsTotal,droppedMotionTime},render:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,batching,lighting:lightBudget.snapshot()},doors:doors.map(d=>({open:d.open,height:d.mesh.position.y})),active,dialogueOpen,nearest:nearest?.name,crew:crew.map(c=>({name:c.name,position:c.body?.translation(),mode:c.state.mode,visitorVisible:c.visitorVisible,duty:c.duty?(c.duty.phase==='watch'?'containment-watch':'returning-to-patrol'):'patrol',dutyPath:c.duty?.path,dutyCursor:c.duty?.cursor,gait:c.gait,walkBlend:c.walkBlend,visual:c.visual?.snapshot()??null,yaw:c.mesh.rotation.y})),touchMove:{x:touchMove.x,y:touchMove.y},reactorColor:reactorMaterial.emissive.getHex(),habitatLight:ceilingSpot.intensity}),place:(x:number,z:number,angle=0)=>{player.setTranslation({x,y:onSurface?terrainHeight(x-SURFACE_ORIGIN,z)+1.05:.9,z},true);yaw=angle;pitch=-.12;velocity.set(0,0,0);verticalSpeed=0;},target:(name:string)=>{const t=targets.find(t=>t.name===name);if(!t)throw new Error('Unknown test target');const z=t.position.z+1.65;player.setTranslation({x:t.position.x,y:onSurface?terrainHeight(t.position.x-SURFACE_ORIGIN,z)+1.05:.9,z},true);yaw=0;pitch=-.3;velocity.set(0,0,0);}}});
}
