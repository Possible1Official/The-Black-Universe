import {parseSalvage,type SalvagePhase} from './rover-salvage';
import {freshVault,parseVault,type VaultProgress} from './signal-vault';
import {crewBriefing} from './crew-briefing';
import {freshPower,parsePower,forgeReadiness,type PowerState} from './power';
import {isFieldScan,type FieldScan} from './survey';
import {freshSupplies,parseSupplies,type Supplies} from './supplies';
import {freshNetwork,parseNetwork,type RelayNetwork} from './relay-expedition';
export const SAVE_KEY='black-universe-v2';
export const LEGACY_SAVE_KEY='black-universe-v1';
export type Relay = 'engineering' | 'navigation' | 'observatory';
export interface Progress { version: 2; relays: Relay[]; forged: boolean; power: PowerState; surveyed: boolean; fieldScans:FieldScan[]; supplies:Supplies; network:RelayNetwork; droneRecovered:boolean; vault:VaultProgress; salvage:SalvagePhase; }
export const RELAYS: Relay[] = ['engineering', 'navigation', 'observatory'];
export const freshProgress = (): Progress => ({version:2,relays:[],forged:false,power:freshPower(),surveyed:false,fieldScans:[],supplies:freshSupplies(),network:freshNetwork(),droneRecovered:false,vault:freshVault(),salvage:'waiting'});
export function parseProgress(raw: string | null): Progress {
  try {
    const p = JSON.parse(raw ?? 'null');
    if (![1,2].includes(p?.version) || !Array.isArray(p.relays) || !p.relays.every((r: unknown) => RELAYS.includes(r as Relay)) || typeof p.forged !== 'boolean') return freshProgress();
    const relays = [...new Set<Relay>(p.relays)];
    const forged=p.forged && relays.length===3;
    const network=parseNetwork(p.network,forged);
    return {version:2,relays,forged,power:p.version===1?freshPower():parsePower(p.power),surveyed:p.surveyed===true && forged,fieldScans:forged&&Array.isArray(p.fieldScans)?[...new Set<FieldScan>(p.fieldScans.filter(isFieldScan))]:[],supplies:parseSupplies(p.supplies,forged),network,droneRecovered:network.online&&p.droneRecovered===true,vault:parseVault(p.vault,network.online),salvage:parseSalvage(p.salvage,network.online)};
  } catch { return freshProgress(); }
}
export function activateRelay(p: Progress, relay: Relay): Progress {return {...p,relays:[...new Set([...p.relays,relay])]};}
export function activateForge(p: Progress): Progress {return {...p,forged:p.forged||forgeReadiness(p.power,p.relays.length)===null};}
export function recordFieldScan(p:Progress,id:FieldScan):Progress {
  return p.forged&&isFieldScan(id)&&!p.fieldScans.includes(id)?{...p,fieldScans:[...p.fieldScans,id]}:p;
}
export function crewLine(name:string,p:Progress):string{return crewBriefing(name,p);}
