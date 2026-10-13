export type Relay = 'engineering' | 'navigation' | 'observatory';
export interface Progress { version: 1; relays: Relay[]; forged: boolean; }
export const RELAYS: Relay[] = ['engineering', 'navigation', 'observatory'];
export const freshProgress = (): Progress => ({version:1,relays:[],forged:false});
export function parseProgress(raw: string | null): Progress {
  try {
    const p = JSON.parse(raw ?? 'null');
    if (p?.version !== 1 || !Array.isArray(p.relays) || !p.relays.every((r: unknown) => RELAYS.includes(r as Relay)) || typeof p.forged !== 'boolean') return freshProgress();
    const relays = [...new Set<Relay>(p.relays)];
    return {version:1,relays,forged:p.forged && relays.length === 3};
  } catch { return freshProgress(); }
}
export function activateRelay(p: Progress, relay: Relay): Progress {return {...p,relays:[...new Set([...p.relays,relay])]};}
export function activateForge(p: Progress): Progress {return {...p,forged:p.relays.length === 3};}
export function crewLine(name: string, p: Progress): string {
  if(p.forged) return name==='VEGA' ? 'A new world. The architect has given it an ocean and an atmosphere. Our next expedition will need a landing craft. For now, watch what we brought into being.' : 'Genesis is stable. I have rerouted power to life support. We should study the new world before we trust its surface.';
  if(name==='VEGA') return p.relays.includes('navigation') ? 'Navigation is online. The engineering relay is in the port room. The observatory relay is across the ship to starboard. Once all three are green, use the architect terminal here on the bridge.' : 'Welcome aboard, Commander. This vessel is a key. That machine outside is the lock. Start with the navigation console behind me, then bring the two side-room relays online.';
  return p.relays.includes('engineering') ? 'Containment is holding. The architect terminal needs all three relays. You can open the bulkheads with the panel beside each door.' : 'The engineering relay is here, beside the reactor. Bring it online and I will hold containment. Watch the door; its access panel is outside the bulkhead.';
}
