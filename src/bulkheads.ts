/** Paired access anchors for the two authored ship bulkheads. */
export function bulkheadPanels(doorX:number){
  const side=Math.sign(doorX);
  return [
    {x:doorX-side,z:3.2,interior:false,name:'Toggle bulkhead'},
    {x:doorX+side,z:3.2,interior:true,name:side<0?'Toggle engineering bulkhead':'Toggle observatory bulkhead'},
  ] as const;
}
