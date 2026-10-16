// Optional authored expedition, independent of the original sample and readings.
export const VAULT={x:66,z:76,width:8,depth:12,height:3.6} as const;
export const VAULT_ARCHIVE='ARCHIVE 04 · The pulse is not a command. It is a receipt: the forge acknowledges each world before its creation. Someone has already surveyed the next one. Coordinates remain incomplete.';
export interface VaultProgress{calibrated:boolean;archived:boolean}
export const freshVault=():VaultProgress=>({calibrated:false,archived:false});
export function parseVault(value:unknown,online:boolean):VaultProgress{
 const v=value as Partial<VaultProgress>|null,calibrated=online&&v?.calibrated===true;
 return {calibrated,archived:calibrated&&v?.archived===true};
}
export function carrierReading(frequency:number,bearing:number){
 if(!Number.isFinite(frequency)||!Number.isFinite(bearing))return {strength:0,locked:false};
 const angle=Math.atan2(Math.sin((bearing-120)*Math.PI/180),Math.cos((bearing-120)*Math.PI/180))*180/Math.PI;
 return {strength:Math.exp(-(((frequency-17.4)/.45)**2)-(angle/30)**2),locked:Math.abs(frequency-17.4)<.05&&Math.abs(angle)<5};
}
export function calibrateVault(v:VaultProgress,online:boolean,frequency:number,bearing:number):VaultProgress{
 return !v.calibrated&&online&&carrierReading(frequency,bearing).locked?{...v,calibrated:true}:v;
}
export function recoverVault(v:VaultProgress,online:boolean):VaultProgress{return online&&v.calibrated&&!v.archived?{...v,archived:true}:v;}
export function vaultStep(v:VaultProgress){return v.calibrated?{id:'archive',label:v.archived?'Signal Vault archive':'Recover vault archive',x:VAULT.x,z:VAULT.z-4.3}:{id:'receiver',label:'Signal Vault receiver',x:VAULT.x+2.7,z:VAULT.z+7.18};}
