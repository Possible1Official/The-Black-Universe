import {freshPower,parsePower,forgeReadiness,type PowerState} from './power';
import {isFieldScan,type FieldScan} from './survey';
import {freshSupplies,parseSupplies,type Supplies} from './supplies';
export const SAVE_KEY='black-universe-v2';
export const LEGACY_SAVE_KEY='black-universe-v1';
export type Relay = 'engineering' | 'navigation' | 'observatory';
export interface Progress { version: 2; relays: Relay[]; forged: boolean; power: PowerState; surveyed: boolean; fieldScans:FieldScan[]; supplies:Supplies; }
export const RELAYS: Relay[] = ['engineering', 'navigation', 'observatory'];
export const freshProgress = (): Progress => ({version:2,relays:[],forged:false,power:freshPower(),surveyed:false,fieldScans:[],supplies:freshSupplies()});
export function parseProgress(raw: string | null): Progress {
  try {
    const p = JSON.parse(raw ?? 'null');
    if (![1,2].includes(p?.version) || !Array.isArray(p.relays) || !p.relays.every((r: unknown) => RELAYS.includes(r as Relay)) || typeof p.forged !== 'boolean') return freshProgress();
    const relays = [...new Set<Relay>(p.relays)];
    const forged=p.forged && relays.length===3;
    return {version:2,relays,forged,power:p.version===1?freshPower():parsePower(p.power),surveyed:p.surveyed===true && forged,fieldScans:forged&&Array.isArray(p.fieldScans)?[...new Set<FieldScan>(p.fieldScans.filter(isFieldScan))]:[],supplies:parseSupplies(p.supplies,forged)};
  } catch { return freshProgress(); }
}
export function activateRelay(p: Progress, relay: Relay): Progress {return {...p,relays:[...new Set([...p.relays,relay])]};}
export function activateForge(p: Progress): Progress {return {...p,forged:p.forged||forgeReadiness(p.power,p.relays.length)===null};}
export function recordFieldScan(p:Progress,id:FieldScan):Progress {
  return p.forged&&isFieldScan(id)&&!p.fieldScans.includes(id)?{...p,fieldScans:[...p.fieldScans,id]}:p;
}
export function crewLine(name: string, p: Progress): string {
  if(p.power.tripped)return 'Containment has tripped. The forge is isolated, but life support is on emergency power. Use the engineering diagnostics console: select Cooling, wait for thermal load below 40%, then reset containment. Any world already created remains stable.';
  if(p.forged) return name==='VEGA' ? 'A new world. Launch Kestrel from the bridge science array or concourse bay and pilot to Nysa. Survey the luminous outcrop; the surface field log charts a resonance arch and ridge weather station for optional scans. Board your shuttle to return.' : 'Genesis is stable. I have rerouted power to life support. We should study the new world before we trust its surface.';
  if(name==='VEGA') return p.relays.includes('navigation') ? 'Navigation is online. The engineering relay is in the port room. The observatory relay is across the ship to starboard. Once all three are green, use the architect terminal here on the bridge.' : 'Welcome aboard, Commander. This vessel is a key. That machine outside is the lock. Start with the navigation console behind me, then bring the two side-room relays online.';
  return p.relays.includes('engineering') ? 'Containment is holding. The architect terminal needs all three relays. You can open the bulkheads with the panel beside each door.' : 'The engineering relay is here, beside the reactor. Bring it online and I will hold containment. Watch the door; its access panel is outside the bulkhead.';
}
