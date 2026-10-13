// Authored readings, not a dynamic weather or alien-language simulation.
export const FIELD_SITES=[
  {id:'arch',label:'Resonance arch',x:-37,z:-32,reading:'A 17.4 Hz resonance repeats through the basalt frame. Its origin is unresolved.'},
  {id:'weather',label:'Ridge weather station',x:40,z:-39,reading:'Pressure 0.83 bar. Wind 6 m/s from the west. Mineral aerosols detected in the ridge air.'}
] as const;
export type FieldScan=typeof FIELD_SITES[number]['id'];
export const isFieldScan=(id:unknown):id is FieldScan=>FIELD_SITES.some(site=>site.id===id);
