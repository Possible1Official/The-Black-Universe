import {PLAYER_MOTION_STRIDES} from './locomotion-strides';
export type FootSurface='metal'|'sand'|'stone'|'wet';
export type FootEvent={kind:'step'|'land';strength:number};
const clamp=(n:number,max=1)=>Number.isFinite(n)?Math.max(0,Math.min(max,n)):0;
/** Distance cadence follows the existing captured walk/run cycle lengths. */
export class FootstepPace{
 private phase=0;private grounded?:boolean;private air=0;private fall=0;
 reset(){this.phase=0;this.grounded=undefined;this.air=0;this.fall=0;}
 sample(distance:number,grounded:boolean,verticalSpeed:number,dt:number,running:number,enabled=true,strides:{walk:number;run:number}=PLAYER_MOTION_STRIDES):FootEvent|undefined{
  if(!Number.isFinite(dt)||dt<=0)return;
  if(!enabled||!Number.isFinite(distance)||distance<0||distance>12*dt){this.reset();return;}
  if(!grounded){if(this.grounded===undefined)return;this.phase=0;this.air+=Math.min(dt,.05);this.fall=Math.max(this.fall,clamp(-verticalSpeed,20));this.grounded=false;return;}
  const landed=this.grounded===false&&this.air>=.12&&this.fall>=1.5,impact=this.fall;this.grounded=true;this.air=this.fall=0;
  if(landed){this.phase=0;return {kind:'land',strength:.3+.7*clamp(impact/8)};}
  this.phase+=distance/((strides.walk+(strides.run-strides.walk)*clamp(running))/2);
  if(this.phase<1)return;this.phase%=1;return {kind:'step',strength:.55+.25*clamp(running)};
 }
}
export interface SoundState{
 location:'ship'|'surface'|'flight';vehicle:'bike'|'rover'|'shuttle'|null;
 speed:number;demand:number;brake:boolean;boost:boolean;tripped:boolean;
}
export function soundMix(s:SoundState){
 const speed=clamp(s.speed),load=s.brake?0:clamp(s.demand),mounted=s.vehicle!==null;
 const frequency=s.vehicle==='bike'?130+180*speed+55*load:s.vehicle==='rover'?42+62*speed+20*load:62+100*speed+35*load;
 return {ship:s.location==='ship'?(s.tripped?.006:.012):0,wind:s.location==='surface'?.016:0,
  motor:mounted?.006+load*.018+(s.boost&&!s.brake?.008:0):0,frequency,
  rolling:s.location==='surface'&&mounted?speed*.014:0,rollingRate:.45+speed*.8};
}
