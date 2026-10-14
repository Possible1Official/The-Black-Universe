import type {FlightState} from './flight';
export function enginePower(f:FlightState,brake:boolean,boost:boolean){
  if(f.phase==='flying')return brake?0:Math.max(0,Math.min(1,f.throttle))*(boost?1:.65);
  return f.phase==='ascending'?.55:f.phase==='descending'?.35:f.phase==='launching'?.45:f.phase==='landing'||f.phase==='docking'?.18:0;
}
export class FlightFeedback {
  power=0;bank=0;time=0;private yaw=0;
  reset(yaw:number){this.power=0;this.bank=0;this.time=0;this.yaw=yaw;}
  step(f:FlightState,yaw:number,brake:boolean,boost:boolean,dt:number){
    if(dt<=0||!Number.isFinite(dt))return;
    const turn=Math.atan2(Math.sin(yaw-this.yaw),Math.cos(yaw-this.yaw));this.yaw=yaw;
    const target=f.phase==='flying'?Math.max(-.22,Math.min(.22,turn/dt*.16)):0;
    this.bank+=(target-this.bank)*(1-Math.exp(-7*dt));
    this.power=enginePower(f,brake,boost);this.time+=dt;
  }
}
