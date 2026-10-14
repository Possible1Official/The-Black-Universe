// Runtime dimensions follow the authored Intrepid rooms, in glTF meters.
export const SHIP_LAYOUT={doorX:2.625,doorZ:-6.0375,roomBoundary:2.1,outsideX:1.25,insideX:4,panelOffsetZ:1.25,
 navigation:{x:0,z:-13.5},engineering:{x:-5,z:-5.7},observatory:{x:5,z:-5.7},diagnostics:{x:-6.2,z:-7.4},forge:{x:0,z:-17.2},science:{x:0,z:-10.5},launch:{x:0,z:4.4},spawn:{x:0,z:1.8}};
export const LEGACY_SHIP_LAYOUT={doorX:11,doorZ:6,roomBoundary:11,outsideX:8.6,insideX:13,panelOffsetZ:2.8,
 navigation:{x:-5,z:-11},engineering:{x:-16,z:10},observatory:{x:16,z:10},diagnostics:{x:-13.5,z:11.7},forge:{x:0,z:-11},science:{x:5,z:-11},launch:{x:5,z:15},spawn:{x:0,z:16}};
export type ShipLayout=typeof SHIP_LAYOUT;
