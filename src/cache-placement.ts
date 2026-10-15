import {SUPPLY_CACHE} from './supplies';
// The visible pallet and conservative cache proxy share this footprint.
export const CACHE_SIZE={width:1.25,depth:1,height:.6} as const;
export function cachePlacement(ground:(x:number,z:number)=>number){
 const heights=[];for(const dx of [-.5,0,.5])for(const dz of [-.5,0,.5])heights.push(ground(SUPPLY_CACHE.x+dx*CACHE_SIZE.width,SUPPLY_CACHE.z+dz*CACHE_SIZE.depth));
 const bottom=Math.min(...heights)-.04,base=Math.max(...heights)+.04;
 return {base,bottom,palletHeight:base-bottom,colliderY:(bottom+base+CACHE_SIZE.height)/2,colliderHalfHeight:(base+CACHE_SIZE.height-bottom)/2};
}
