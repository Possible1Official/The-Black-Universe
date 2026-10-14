/** Paired access anchors for the two authored ship bulkheads. */
export function bulkheadPanels(doorX:number,doorZ=6,offsetZ=2.8){
  const side=Math.sign(doorX);
  return [
    {x:doorX-side,z:doorZ-offsetZ,interior:false,name:'Toggle bulkhead'},
    {x:doorX+side,z:doorZ-offsetZ,interior:true,name:side<0?'Toggle engineering bulkhead':'Toggle observatory bulkhead'},
  ] as const;
}
