// Deterministic regional terrain, in local meters. Shared by render, physics and map.
export type Biome='dunes'|'basalt'|'wetland'|'highland';
export function biomeAt(x:number,z:number):Biome{
 if(x>22&&z< -15)return 'highland';
 if(x< -17&&z<3)return 'basalt';
 if(x>12&&z>12)return 'wetland';
 return 'dunes';
}
const bell=(x:number,z:number,cx:number,cz:number,width:number)=>Math.exp(-((x-cx)**2+(z-cz)**2)/(width*width));
export function regionalRelief(x:number,z:number){
 const dunes=.55*Math.sin(x*.18+Math.sin(z*.07))*Math.cos(z*.08);
 const mesa=6.5*bell(x,z,-46,-42,15)+2.4*bell(x,z,-45,-12,11);
 const ridge=5.5*bell(x,z,42,-41,19)+2*bell(x,z,52,-8,13);
 const basin=-2.8*bell(x,z,32,34,17);
 return dunes+mesa+ridge+basin;
}
export const WATER_LEVEL=-1.35;

/** Smooth overlapping regional influence avoids colored seams across terrain cells. */
export function biomeWeights(x:number,z:number){
 const smooth=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};
 const highland=smooth((x-14)/16)*smooth((-z-7)/16);
 const basalt=smooth((-x-9)/16)*smooth((11-z)/16);
 const wetland=smooth((x-4)/16)*smooth((z-4)/16);
 const dunes=(1-highland)*(1-basalt)*(1-wetland),sum=dunes+highland+basalt+wetland;
 return {dunes:dunes/sum,highland:highland/sum,basalt:basalt/sum,wetland:wetland/sum};
}
