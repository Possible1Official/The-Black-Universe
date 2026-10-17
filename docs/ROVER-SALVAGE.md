# Rover contract / Lost Recorder

After restoring Silent Network, open J / FIELD LOG → Track lost recorder. A cargo recorder awaits recovery at Nysa local X−98 / Z80. The outpost cargo depot is at X69 / Z−73. This optional transport contract gives the rover a purpose beyond getting around; the original sample, scans, ECHO and Signal Vault remain independent.

1. Drive the Sci-fi Rover to the recorder's marked pallet. Park within5.5m on clear ground, brake fully, then press E to dismount.
2. Approach the small pallet terminal and use **Load recorder into rover**. A remote, moving, obstructed or vertically separated rover is rejected; the bike cannot carry it. The textured recorder moves onto a fitted rear rack with visible tie-downs.
3. Board the rover and drive to the outpost cargo depot. FIELD LOG tracking automatically switches to the depot after loading. The drive HUD reports cargo when its information is visible; no new permanent overlay is added.
4. Brake and park within5.5m of the depot, dismount and use **Deliver rover recorder**. The same crate moves onto the depot pallet. The recovered motor tables unlock **16m/s rover cruise**, up from14. The bike retains12m/s. Revisit the terminal for the recorder's story; deliveries cannot be repeated for additional rewards.

Cargo phase and the upgrade save locally. Reload safely starts aboard; loaded cargo stays with the rover and redeploys on the next landing. Vehicle locations remain transient as before. You can still return with Kestrel at any time. Reset clears the contract, restores the field recorder and returns rover cruise to14m/s. It does not introduce cargo loss, fuel, vehicle damage or an inventory account.

## Asset fit and physics

Reuse desanlisadrien1's reviewed CGTrader Sci-fi asset pack crate and dragosh21's rover, with original source geometry, materials and PBR maps. All14 packaged resources/rights/hashes stay unchanged; no new model download, sign-in or conversion. Cargo is uniformly scaled to60% of its source derivative (75×36×60cm). The two sources are static; there is no captured loading animation to play. Loading is an instantaneous game interaction. The existing wheel spin, steering knuckles and articulated terrain-following arms continue while driving.

Sample four actual rear-deck intersections on `Rover_Chassis` at local X±.30 and Z.27/.73. A small rigid rack has feet reaching those measured contacts, a horizontal plate, and two tie-downs. Its cargo inherits the chassis transform through pitch/roll rather than floating independently or following tire motion. Fitting leaves every source geometry/material reference intact. Actual cargo-envelope checks find no chassis/roll-cage triangle intersection, and combined cargo bounds stay within the existing rover proxy, so no self-colliding mounted crate is added. A bounded fallback rack remains for asset failure; successful fit occurs once per loaded chassis.

One crate object transfers field→rack→depot. The field/depot crate has matching box collision; while carried that collider is disabled. Both pallets sample the actual rendered terrain and extend into it; visible terminals have matching boxes. Scatter excludes approaches. A collision sight query from rover to pallet rejects loading through walls/props. No invisible obstacle stays behind when the crate is picked up.

The rover remains a kinematic vehicle with the existing swept character controller and presentation suspension. No cargo mass, force-based tie-downs, winch, articulated crane or physical loading animation is simulated. The upgrade changes bounded cruise target only; braking and obstacle resolution still apply at16m/s. Real-device FPS/memory and hosted rendering are unmeasured.

Six tests cover progression/guards and saves, actual source-deck fit through transforms, conserved crate transfer/late import/collision sight, terrain/scatter support, and real upgraded-speed braking/wall contact. Focused browser controls, images and limits are recorded in PROGRESS. Distant-site setup fixtures do not represent an uninterrupted full-sector delivery drive.
