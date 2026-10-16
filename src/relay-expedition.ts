// Optional expedition; authored fiction and persistent interactions, not AI.
export const REPAIR_SITES=[
 {id:'dune',label:'Dune relay',x:-76,z:64,reading:'The sand-clogged receiver is cleared and its coupler reseated. The western carrier is stable.'},
 {id:'basalt',label:'Basalt relay',x:-83,z:-78,reading:'The fractured signal bridge is bypassed. The northern carrier is stable.'}
] as const;
export type RepairId=typeof REPAIR_SITES[number]['id'];
export const OUTPOST={x:76,z:-80,width:8,depth:8,height:3.6} as const;
export const RELAY_PAD={x:76,z:-55,label:'Relay pad'} as const;
export interface RelayNetwork {repairs:RepairId[];online:boolean}
export const freshNetwork=():RelayNetwork=>({repairs:[],online:false});
export const isRepair=(id:unknown):id is RepairId=>REPAIR_SITES.some(s=>s.id===id);
export function parseNetwork(value:unknown,forged:boolean):RelayNetwork{
 const p=value as Partial<RelayNetwork>|null;
 const repairs:RepairId[]=forged&&Array.isArray(p?.repairs)?[...new Set(p.repairs.filter(isRepair))]:[];
 return {repairs,online:forged&&repairs.length===REPAIR_SITES.length&&p?.online===true};
}
export function repairRelay(network:RelayNetwork,id:RepairId,forged:boolean):RelayNetwork{
 return forged&&isRepair(id)&&!network.repairs.includes(id)?{...network,repairs:[...network.repairs,id]}:network;
}
export function uplinkBlock(network:RelayNetwork,forged:boolean):string|null{
 if(!forged)return 'Create Nysa before accessing its relay network.';
 const missing=REPAIR_SITES.filter(s=>!network.repairs.includes(s.id));
 return missing.length?'Carrier missing: repair '+missing.map(s=>s.label).join(' and ')+'. FIELD LOG can track each site.':null;
}
export function activateUplink(network:RelayNetwork,forged:boolean):RelayNetwork{
 return network.online||uplinkBlock(network,forged)?network:{...network,online:true};
}
export function expeditionStep(network:RelayNetwork){
 return REPAIR_SITES.find(s=>!network.repairs.includes(s.id))??{id:'uplink' as const,label:'Communications outpost',x:OUTPOST.x,z:OUTPOST.z-1};
}
