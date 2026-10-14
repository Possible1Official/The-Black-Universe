type Point={x:number;y:number;z:number};
// Shared exterior hull dimensions in sector meters. Lights/trim are decorative.
export const STATION_HULL=[
  {size:[62,8,85],position:[0,-9,10]}, {size:[62,8,85],position:[0,9,10]},
  {size:[10,18,85],position:[-28,0,10]}, {size:[10,18,85],position:[28,0,10]},
  {size:[62,18,5],position:[0,0,52]},
  {size:[25,12,45],position:[-45,0,20]}, {size:[25,12,45],position:[45,0,20]}
] as const;
export const CRAFT_CLEARANCE=3.5;
// Supplied station is the elevated habitat assembly; the open docking bay below
// retains its tested corridor. Conservative envelope covers the imported model.
export const STATION_ASSEMBLY={size:[88,28,120],position:[0,27,10]} as const;
const axes=['x','y','z'] as const;
const bounds=[...STATION_HULL,STATION_ASSEMBLY].map(b=>({min:{x:b.position[0]-b.size[0]/2-CRAFT_CLEARANCE,y:b.position[1]-b.size[1]/2-CRAFT_CLEARANCE,z:b.position[2]-b.size[2]/2-CRAFT_CLEARANCE},max:{x:b.position[0]+b.size[0]/2+CRAFT_CLEARANCE,y:b.position[1]+b.size[1]/2+CRAFT_CLEARANCE,z:b.position[2]+b.size[2]/2+CRAFT_CLEARANCE}}));
export const stationContains=(p:Point)=>bounds.some(b=>axes.every(a=>p[a]>b.min[a]&&p[a]<b.max[a]));
export function stationRecovery(p:Point):Point|null {
  if(!stationContains(p))return null;
  let best:Point|null=null,distance=Infinity;
  // Search union-clear axis exits so adjoining boxes cannot cause contact oscillation.
  for(const b of bounds)for(const a of axes)for(const value of [b.min[a]-.01,b.max[a]+.01]){
    const candidate={...p,[a]:value},d=Math.abs(value-p[a]);
    if(d<distance&&!stationContains(candidate)){best=candidate;distance=d;}
  }
  return best;
}
export function inDockingZone(p:Point){
  return !stationContains(p)&&(p.z<=-36||(Math.abs(p.x)<=19.5&&Math.abs(p.y)<=1.5&&p.z>=-36&&p.z<=46));
}
