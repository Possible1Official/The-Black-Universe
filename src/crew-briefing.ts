import type {Progress} from './state';
import {FIELD_SITES} from './survey';
import {expeditionStep} from './relay-expedition';
export type BriefingTopic='mission'|'survey'|'systems';
export function crewBriefing(name:string,p:Progress,topic:BriefingTopic='mission'):string{
 if(p.power.tripped)return `Containment has tripped. Thermal load ${Math.round(p.power.heat)}%. Select Cooling at engineering diagnostics, cool to 40% or less, then reset manually. Reserve ${p.supplies.coolant}/2 can support cooling; discharging it does not clear the trip. Any created world remains stable.`;
 if(topic==='systems')return `Routing ${p.power.profile.toUpperCase()} · thermal load ${Math.round(p.power.heat)}% · reserve ${p.supplies.coolant}/2. ${p.power.heat>=75?'Thermal warning: switch to Cooling before another trip.':p.power.profile==='genesis'?'Genesis increases forge output and heat. Balanced is the stable routing choice.':'Containment is nominal.'} ${p.supplies.cacheClaimed?'The Nysa cache is already recovered; primary Cooling remains available.':p.supplies.coolant<2?'The Nysa supply cache can refill the reserve once.':'The reserve is full; leave the field cache until needed.'}`;
 if(topic==='survey'){
  if(!p.forged)return 'No world has been created yet. Restore the three relays and initialize the architect before surveying Nysa.';
  const readings=FIELD_SITES.filter(s=>p.fieldScans.includes(s.id)).map(s=>`${s.label}: ${s.reading}`).join(' ');
  return `${p.surveyed?'Outcrop sample secured.':'Outcrop sample not yet collected.'} Field readings ${p.fieldScans.length}/${FIELD_SITES.length}. ${readings||'No optional readings recorded.'} ${p.network.online?`Relay network online. The new Relay pad is available to Kestrel. Archive 03 reports a signal arriving before its source. ${p.vault.archived?'Vault Archive 04 recovered: the forge pulse is a receipt.':p.vault.calibrated?'Signal Vault is open; recover its interior archive.':'Archive 03 identifies the Signal Vault carrier:17.4 Hz, bearing120 degrees. FIELD LOG can track it.'} ${p.salvage==='delivered'?'Survey recorder delivered; rover cruise is calibrated to16 m/s.':p.salvage==='loaded'?'Survey recorder secured on the rover. Deliver it to the outpost cargo depot.':'A lost recorder awaits rover recovery at X-98 / Z80. FIELD LOG can track the salvage contract.'} ${p.droneRecovered?'ECHO is recovered and deploys with Kestrel.':'ECHO can now be reactivated beside the outpost.'}`:`Relay expedition: ${p.network.repairs.length}/2 receivers restored. FIELD LOG can track ${expeditionStep(p.network).label}.`}`;
 }
 if(p.forged){
  if(name==='ION')return `Genesis is stable. ${crewBriefing(name,p,'systems')} ${p.surveyed?'Your outcrop sample is recorded.':'The surface sample remains uncollected.'}`;
  const missing=FIELD_SITES.find(s=>!p.fieldScans.includes(s.id));
  return `${p.surveyed?'Sample secured.':'Nysa awaits its first sample.'} ${p.fieldScans.length}/${FIELD_SITES.length} optional readings recorded. ${!p.surveyed?'Launch Kestrel, land and survey the luminous outcrop.':missing?.id==='arch'?'The resonance arch is still unscanned. PAD/L selects the nearby Arch landing pad before capture.':missing?'The ridge weather station is still unscanned. FIELD LOG/J shows its coordinates and terrain.':'Both survey readings are recorded. You can revisit either landing pad freely.'} Board Kestrel to return; the field log can restore mission guidance.`;
 }
 if(name==='VEGA'){
  if(!p.relays.includes('navigation'))return 'Welcome aboard, Commander. Start with the navigation console behind me, then bring the side-room relays online.';
  if(!p.relays.includes('engineering'))return 'Navigation is online. Restore the engineering relay in the port room; its bulkhead has an access panel.';
  if(!p.relays.includes('observatory'))return 'Navigation is online and engineering is ready. The observatory relay is in the starboard room.';
  return 'All three relays are online. Return to the architect terminal here on the bridge to create Nysa.';
 }
 return p.relays.includes('engineering')?'Engineering is online. Restore the remaining relays, then use the architect. Both bulkheads have interior access controls.':'The engineering relay is beside the reactor. Its diagnostics control routing, cooling and containment reset.';
}
