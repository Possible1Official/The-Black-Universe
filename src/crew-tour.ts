import type {Point,PatrolState} from './patrol';
import type {Progress} from './state';

// Authored clear lanes in Intrepid, not a general navigation mesh.
export const TOUR_ROUTE:readonly (Point&{stop?:'bridge'|'forge'|'engineering'|'observatory'|'habitat'})[]=[
 {x:1.35,z:-9},{x:1.35,z:-12,stop:'bridge'},
 {x:1.35,z:-16,stop:'forge'},{x:1.35,z:-8.15},{x:.8,z:-8.15},{x:.8,z:-6.1},
 {x:-3.5,z:-6.1,stop:'engineering'},{x:.8,z:-6.1},
 {x:3.5,z:-6.1,stop:'observatory'},{x:.8,z:-6.1},
 {x:1.35,z:1.5,stop:'habitat'},
 {x:.8,z:-6.1},{x:.8,z:-8.15},{x:1.35,z:-8.15},{x:1.35,z:-9},{x:.7,z:-9},
];
export type TourState={cursor:number;phase:'walking'|'stop'|'return';blocked:number;waiting:boolean};
export const startTour=():TourState=>({cursor:0,phase:'walking',blocked:0,waiting:false});
export const continueTour=(t:TourState):TourState=>t.phase==='stop'?{...t,cursor:t.cursor+1,phase:'walking',blocked:0,waiting:false}:t;
// Reverse only the already traversed lane. Cancellation never shortcuts walls.
export function cancelTour(t:TourState):TourState{return t.phase==='return'?t:{...t,cursor:Math.max(0,t.phase==='stop'?t.cursor:t.cursor-1),phase:'return',blocked:0,waiting:false};}
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
export function planTour(previous:TourState,patrol:PatrolState,position:Point,visitor:Point,dt:number,speaking=false){
 const tour={...previous},state={...patrol,blocked:0};
 const node=TOUR_ROUTE[tour.cursor];
 if(!node)return {tour:null,state,displacement:{x:0,z:0},facing:visitor};
 const arrived=distance(position,node)<.12;
 if(arrived){
  if(tour.phase==='return'){
   if(tour.cursor===0)return {tour:null,state,displacement:{x:0,z:0},facing:visitor};
   tour.cursor--;
  }else if(node.stop)tour.phase='stop';
  else tour.cursor++;
 }
 if(tour.cursor>=TOUR_ROUTE.length)return {tour:null,state,displacement:{x:0,z:0},facing:visitor};
 const facing=TOUR_ROUTE[tour.cursor],gap=distance(position,visitor);
 tour.waiting=gap>6;
 if(speaking||tour.phase==='stop'||gap<.85||tour.waiting){state.mode='attending';return {tour,state,displacement:{x:0,z:0},facing:visitor};}
 const dx=facing.x-position.x,dz=facing.z-position.z,len=Math.hypot(dx,dz),step=Math.min(len,.65*Math.max(0,Math.min(.05,dt)));
 state.mode='patrolling';return {tour,state,displacement:len?{x:dx/len*step,z:dz/len*step}:{x:0,z:0},facing};
}
export function recordTourMovement(t:TourState,intended:number,actual:number,dt:number):TourState{
 return {...t,blocked:intended>.001&&actual<intended*.1?Math.min(2,t.blocked+Math.max(0,dt)):0};
}
export function tourLine(t:TourState,p:Progress):string{
 if(t.phase==='return')return 'I am returning along our route to the bridge. Follow me; I will wait if you fall behind.';
 if(t.phase!=='stop')return t.blocked>=2?'The passage is obstructed. Clear the lane and I will continue.':t.waiting?'I am waiting for you. Come within six meters and we can continue.':'Follow me to the next ship system. I will wait at each stop; speak with me for its briefing.';
 switch(TOUR_ROUTE[t.cursor]?.stop){
  case 'bridge':return `This is navigation and deep scan. ${p.relays.includes('navigation')?'Navigation is online.':'Activate the navigation relay at the forward console.'} After genesis, deep scan identifies Nysa before your first flight.`;
  case 'forge':return `The Architect controls the universe forge outside. ${p.forged?'Nysa is already stable. The forge does not need to run continuously to preserve it.':'Restore all three relays, then initialize the Architect here.'} The sealed launch runway beyond this bow leads to Kestrel.`;
  case 'engineering':return `Engineering supplies the forge. ${p.power.tripped?'Ion is attending a containment trip: select Cooling, reach40% heat, then reset manually.':'Balanced routing is stable; Genesis increases heat, while Cooling reduces it.'} The reserve rack carries ${p.supplies.coolant}/2 coolant cartridges. Ion remains responsible for diagnostics.`;
  case 'observatory':return `The spectral array completes the three-relay network. ${p.relays.includes('observatory')?'Its relay is online.':'Restore the observatory relay here.'} Nysa field readings and recovered archives appear in your field log; your progress stays on this device.`;
  default:return 'This is the habitat concourse. The bedroom connects aft; Kestrel boards through the sealed bow runway. In flight, brake before landing or docking. That completes the tour. Continue and I will return to bridge patrol.';
 }
}
