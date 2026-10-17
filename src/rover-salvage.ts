import {OUTPOST} from './relay-expedition';
export const SALVAGE_PICKUP={x:-98,z:80,label:'Lost survey recorder'} as const;
export const SALVAGE_DEPOT={x:OUTPOST.x-7,z:OUTPOST.z+7,label:'Outpost cargo depot'} as const;
export type SalvagePhase='waiting'|'loaded'|'delivered';
export function parseSalvage(v:unknown,online:boolean):SalvagePhase{return online&&(v==='loaded'||v==='delivered')?v:'waiting';}
export interface ParkedRover{x:number;y:number;z:number;speed:number;visible:boolean}
export function salvageBlock(phase:SalvagePhase,online:boolean,action:'load'|'deliver',rover:ParkedRover|undefined,base:number):string|null{
 if(!online)return 'Restore Silent Network before releasing the recorder transport lock.';
 if(phase==='delivered')return 'Recorder delivered. Rover drive calibration is unlocked:16 m/s cruise.';
 if(action==='load'&&phase==='loaded')return 'Recorder secured on the rover. Deliver it to the outpost cargo depot.';
 if(action==='deliver'&&phase!=='loaded')return 'Recover the lost recorder with the rover first. FIELD LOG can track it.';
 const site=action==='load'?SALVAGE_PICKUP:SALVAGE_DEPOT;
 if(!rover||![rover.x,rover.y,rover.z,rover.speed].every(Number.isFinite)||Math.hypot(rover.x-site.x,rover.z-site.z)>5.5||Math.abs(rover.y-base)>3)return 'Park the Sci-fi Rover within5.5m of the marked pallet, then dismount and approach this terminal.';
 if(Math.abs(rover.speed)>.5)return 'Brake the rover to a complete stop before transferring the recorder.';
 return rover.visible?null:'Rover loading path obstructed. Park on clear ground beside the pallet.';
}
export function salvageStep(phase:SalvagePhase){return phase==='waiting'?SALVAGE_PICKUP:SALVAGE_DEPOT;}
export const SALVAGE_ARCHIVE='RECORDER RECOVERED · Its survey predates the outpost. Three discontinuities in the forge signal mark a route beyond Nysa. Navigation still needs a destination fix. The recovered motor tables unlock16 m/s rover cruise.';
export const SALVAGE_SIZE={width:.75,height:.36,depth:.6} as const;
export function salvagePallet(site:{x:number;z:number},ground:(x:number,z:number)=>number){
 const samples=[];for(const x of [-.6,0,.6])for(const z of [-.5,0,.5])samples.push(ground(site.x+x,site.z+z));
 const bottom=Math.min(...samples)-.025,top=Math.max(...samples)+.045;return {bottom,top,height:top-bottom};
}
