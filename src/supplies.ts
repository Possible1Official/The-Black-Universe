import type {PowerState} from './power';
// Bounded fictional reserve: each cartridge removes 25 thermal-load points.
export interface Supplies {coolant:number;cacheClaimed:boolean}
export const freshSupplies=():Supplies=>({coolant:2,cacheClaimed:false});
export function parseSupplies(value:unknown,forged:boolean):Supplies{
  const p=value as Partial<Supplies>|null;
  return {coolant:typeof p?.coolant==='number'&&Number.isInteger(p.coolant)&&p.coolant>=0&&p.coolant<=2?p.coolant:2,cacheClaimed:forged&&p?.cacheClaimed===true};
}
export function coolantBlock(power:PowerState,supplies:Supplies){
  return supplies.coolant<=0?'Reserve depleted. Recover the Nysa supply cache or use normal Cooling.':power.heat<=40?'Thermal load is already within the safe reset range.':null;
}
export function dischargeCoolant(power:PowerState,supplies:Supplies){
  if(coolantBlock(power,supplies))return {power,supplies,used:false};
  // A latched trip still needs the existing manual containment reset.
  return {power:{...power,heat:Math.max(0,power.heat-25)},supplies:{...supplies,coolant:supplies.coolant-1},used:true};
}
export function recoverSupplies(supplies:Supplies,forged:boolean){
  return forged&&!supplies.cacheClaimed&&supplies.coolant<2?{coolant:2,cacheClaimed:true}:supplies;
}
export const SUPPLY_CACHE={x:19,z:-21} as const;
