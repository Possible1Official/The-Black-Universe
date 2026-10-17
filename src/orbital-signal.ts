import {WAYFINDER} from './orbital-layout';
import {NYSA_CENTER,NYSA_RADIUS,flightSpeed,type FlightState,type Vec3} from './flight';
import {STATION_HULL,STATION_ASSEMBLY} from './station';
import {VESPER,VESPER_RADIUS} from './vesper';
export const SIGNAL_RANGE=45,SIGNAL_SPEED=6,SIGNAL_SECONDS=3;
export const SIGNAL_ARCHIVE='ARCHIVE 05 / WAYFINDER · Nysa was not the first survey. This relay carries a signed receipt from an older forge cycle: a second biosphere survived creation. Transit fragments chart Vesper at sector710/130/−1230. FIELD LOG can now track its frozen survey basin; pilot Kestrel to the near-side approach ring and brake before landing.';
export const signalDistance=(p:Vec3)=>Math.hypot(p.x-WAYFINDER.x,p.y-WAYFINDER.y,p.z-WAYFINDER.z);
function crossesBox(from:Vec3,to:Vec3,size:readonly number[],center:readonly number[]){
 let lo=0,hi=1;for(const [i,axis]of (['x','y','z'] as const).entries()){
  const delta=to[axis]-from[axis],min=center[i]-size[i]/2,max=center[i]+size[i]/2;
  if(Math.abs(delta)<1e-9){if(from[axis]<min||from[axis]>max)return false;continue;}
  const a=(min-from[axis])/delta,b=(max-from[axis])/delta;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));if(lo>hi)return false;
 }return hi>0&&lo<1;
}
/** Conservative rendered station boxes and Nysa globe occlude the receiver beam. */
export function signalVisible(from:Vec3,to:Vec3=WAYFINDER){
 if(![from.x,from.y,from.z,to.x,to.y,to.z].every(Number.isFinite))return false;
 if([...STATION_HULL,STATION_ASSEMBLY].some(b=>crossesBox(from,to,b.size,b.position)))return false;
 const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z,length=dx*dx+dy*dy+dz*dz;
 return ([[NYSA_CENTER,NYSA_RADIUS],[VESPER,VESPER_RADIUS]] as const).every(([center,radius])=>{const t=Math.max(0,Math.min(1,((center.x-from.x)*dx+(center.y-from.y)*dy+(center.z-from.z)*dz)/Math.max(length,1e-9)));return Math.hypot(from.x+dx*t-center.x,from.y+dy*t-center.y,from.z+dz*t-center.z)>radius;});
}
export function signalBlock(f:FlightState,key:boolean,yaw:number,pitch:number):string|null{
 if(!key)return 'Recover Signal Vault Archive 04 to decrypt Wayfinder.';
 if(f.phase!=='flying')return 'Manual flight required.';
 const distance=signalDistance(f.position),speed=flightSpeed(f);
 if(!Number.isFinite(distance)||distance>SIGNAL_RANGE)return 'Approach Wayfinder within45m.';
 if(!Number.isFinite(speed)||speed>SIGNAL_SPEED)return 'Brake below6m/s to scan.';
 if(!Number.isFinite(yaw)||!Number.isFinite(pitch))return 'Align Kestrel’s nose with the relay.';
 const d={x:WAYFINDER.x-f.position.x,y:WAYFINDER.y-f.position.y,z:WAYFINDER.z-f.position.z};
 const alignment=(-Math.sin(yaw)*Math.cos(pitch)*d.x+Math.sin(pitch)*d.y-Math.cos(yaw)*Math.cos(pitch)*d.z)/Math.max(distance,.001);
 if(alignment<Math.cos(Math.PI/9))return 'Align Kestrel’s nose within20° of the relay.';
 if(!signalVisible(f.position))return 'Receiver occluded. Clear the station or planet.';
 return null;
}
export class OrbitalScan{
 active=false;private elapsed=0;reason='';
 cancel(){this.active=false;this.elapsed=0;this.reason='';}
 begin(f:FlightState,key:boolean,yaw:number,pitch:number){
  if(this.active)return false;const reason=signalBlock(f,key,yaw,pitch);if(reason){this.reason=reason;return false;}
  this.active=true;this.elapsed=0;this.reason='';return true;
 }
 step(f:FlightState,key:boolean,yaw:number,pitch:number,dt:number){
  if(!this.active||!Number.isFinite(dt)||dt<=0)return false;
  const reason=signalBlock(f,key,yaw,pitch);if(reason){this.cancel();this.reason=reason;return false;}
  this.elapsed=Math.min(SIGNAL_SECONDS,this.elapsed+Math.min(dt,.05));if(this.elapsed<SIGNAL_SECONDS-1e-8)return false;
  this.elapsed=SIGNAL_SECONDS;this.active=false;return true;
 }
 snapshot(){return {active:this.active,elapsed:this.elapsed,progress:this.elapsed/SIGNAL_SECONDS,reason:this.reason};}
}
