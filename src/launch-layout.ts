// Shared local runway geometry; kept free of scene/asset imports.
export const LAUNCH_BAY={innerZ:-18.95,outerZ:-43.25,centerZ:-30.95,parkZ:-25.8,endZ:-49,returnZ:-51,boarding:{x:2.8,y:1.1,z:-23.6},exit:{x:1.35,y:.9,z:-19.8},cabinZ:10.825} as const;
export const LOCAL_JET_Y=.06;
export const RUNWAY_DEPARTURE_SECONDS=5;
export const RUNWAY_EXIT_SPEED=2*(LAUNCH_BAY.parkZ-LAUNCH_BAY.endZ)/RUNWAY_DEPARTURE_SECONDS;
