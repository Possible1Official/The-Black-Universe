/** Fictional, normalized ship model: heat is a gameplay load index, not Celsius. */
export type PowerProfile = 'balanced' | 'genesis' | 'cooling';
export interface PowerState { profile: PowerProfile; heat: number; tripped: boolean }
export const freshPower = (): PowerState => ({profile:'balanced',heat:24,tripped:false});
const profiles = {
  balanced: {forge:.55,habitat:1,target:38,tau:15},
  genesis: {forge:1,habitat:.55,target:112,tau:15},
  cooling: {forge:.1,habitat:.8,target:18,tau:6},
} as const;
export function parsePower(value: unknown): PowerState {
  const p=value as Partial<PowerState>|null;
  if(!p || !['balanced','genesis','cooling'].includes(p.profile??'') || typeof p.heat!=='number' || !Number.isFinite(p.heat) || p.heat<0 || p.heat>100 || typeof p.tripped!=='boolean')return freshPower();
  return {profile:p.profile!,heat:p.heat,tripped:p.tripped||p.heat>=95};
}
export function powerOutput(p:PowerState,relayCount:number){
  const capacity=Math.min(3,Math.max(0,relayCount))/3*100;
  return {capacity,forge:p.tripped?0:capacity*profiles[p.profile].forge,habitat:p.tripped?.4:profiles[p.profile].habitat,status:p.tripped?'tripped':p.heat>=75?'warning':'nominal'} as const;
}
export function stepPower(p:PowerState,relayCount:number,dt:number):PowerState {
  if(!Number.isFinite(dt)||dt<=0)return {...p};
  const route=profiles[p.profile],load=Math.min(3,Math.max(0,relayCount))/3;
  const target=p.tripped?18:18+(route.target-18)*load;
  const tau=p.tripped?(p.profile==='cooling'?6:12):route.tau;
  const heat=Math.min(100,Math.max(0,target+(p.heat-target)*Math.exp(-dt/tau)));
  return {...p,heat,tripped:p.tripped||heat>=95};
}
export function resetContainment(p:PowerState):PowerState {
  return p.tripped&&p.heat<=40?{...p,profile:'balanced',tripped:false}:{...p};
}
export function forgeReadiness(p:PowerState,relayCount:number):string|null {
  if(relayCount<3)return 'Restore all three power relays first.';
  if(p.tripped)return 'Containment tripped. Cool and reset it at engineering diagnostics.';
  if(p.heat>=80)return 'Thermal load is too high. Route power to cooling in engineering.';
  if(powerOutput(p,relayCount).forge<40)return 'Forge bus is underpowered. Select Balanced or Genesis in engineering.';
  return null;
}
