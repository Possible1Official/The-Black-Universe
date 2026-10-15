# Roadmap

Vision: an immersive, physically coherent browser universe with explorable vessels and worlds, believable characters, and increasingly capable NPCs. This is a long-term program, not a promise of television-level realism from one build.

## Foundation (released v0.1.0)
- Starship bridge, concourse, engineering and observatory; animated colossal universe forge.
- First-person controls, touch controls, Rapier collision, functioning bulkheads.
- Restore three relays, initialize genesis, scan resulting planet; device-local save.
- Temporary articulated android crew with state-aware scripted dialogue.
- Tests, private Sites publication, rollback reference, hourly development task.

## Incremental crew milestone (2026-10-13)
- Physical local patrols, endpoint waits, smooth turns, player proximity attention and blocked-route reversal.
- Movement-driven arm/leg animation, solid access consoles and pause/dialogue input cleanup.
- Placeholder meshes and scripted dialogue remain; arbitrary pathfinding and task planning are still future work.

## Ship power milestone (2026-10-13)
- Engineering routing presets, normalized thermal dynamics, latched containment trips and manual cooling/reset.
- Observable reactor emission and lighting changes, forge guards, crew trip guidance and v1→v2 save migration.
- Stable defaults retain the original mission; planetary landing, navigation aids and broader ship systems remain future work.

## Nysa excursion milestone (2026-10-13)
- One bounded 64-meter procedural survey site with shared render/physics terrain, instanced biome detail and visible colliding perimeter.
- Bridge deployment, sample objective, extraction, saved survey status and safe reload aboard.
- Instantaneous transfer only; shuttle flight and planet-wide exploration remain future work.

## Mission navigation milestone (2026-10-13)
- Live heading, relative waypoint arrow and horizontal distance for ship and surface objectives.
- Scripted room/doorway guidance, power-recovery priority and sample-to-extraction transition.
- Compact touch HUD and modal visibility; no general pathfinding or planetary map.

## Frame-pacing correction (2026-10-13)
- Bounded 60 Hz catch-up for player/crew/door motion, clean modal/transfer time boundaries and wall-time notification expiry.
- Measured software-renderer walking speed restored toward 3 m/s; rendering FPS is unchanged.
- Deterministic Rapier low-frame-rate collision/jump tests and dev-only render counters.

## Static ship rendering milestone (2026-10-13)
- Spatial instancing for 103 opaque static cuboids, retaining independent doors, screens and crew.
- Sampled ship draw counts reduced 13–23%, with less than 1% additional submitted triangles.
- Hardware GPU measurements remain future work; no FPS gain is claimed.

## Performance lighting budget (2026-10-13)
- Four fixed point-light slots select nearby ship sources with hysteresis and fade handoffs; High retains all nine sources.
- Live reactor/power uniforms and surface hide/quality-change/return behavior are preserved.
- This trades distant light spill for fewer direct-light evaluations; hardware FPS and baked lighting remain unverified.

## Nysa ground material polish (2026-10-13)
- Seamless generated ground texture, elevation/slope blending and four-meter world-space tiling.
- High-mode normal/roughness maps; performance mode keeps the color texture with uniform roughness.
- Shared terrain/collision vertices and the existing sample/extraction loop remain unchanged; authored landscape and hardware measurements are future work.

## Engineering crew duty (2026-10-13)
- Ion responds to containment trips with a diagnostics watch, using a three-node engineering graph.
- Visitor/conversation yielding, obstruction retry, station holding and safe return to patrol after reset.
- Goal selection is local and scripted; ship-wide routing, general task planning and automatic repairs remain future work.

## Interaction visibility and crew awareness (2026-10-13)
- Collision sight checks prevent activating access panels through solid walls and revalidate targets when E is pressed.
- Nearby crew use capped eye-to-eye sight samples for patrol/watch attention, with personal-space yielding retained.
- Collision approximations and omnidirectional nearby awareness only; richer perception and ship-wide tasks remain future work.

## Interior bulkhead controls (2026-10-13)
- Engineering and observatory access panels operate their existing bulkheads from inside.
- Closed-door exit guidance points to the interior panel; open-door guidance retains the passage route.
- Shared access-screen texture, physical consoles and preserved collision sight/safety release.

## First Mixamo crew import (2026-10-13)
- Visually compared Ely, Exo Gray, Vanguard and Eve in the authenticated Mixamo viewer before downloading.
- Bundled Ely skin with in-place Idle/Walking, cloned skeletons, distance-driven walk and idle blend; physics/tasks remain local.
- 14,808 triangles, 67 bones, four 1K textures, 4.826 MB GLB; procedural loading-failure fallback.
- Both officers currently share one appearance; no facial animation, IK, run clip or photorealism claim.

## Crew download budget (2026-10-13)
- Lossless embedded WebP maps reduce the shared character GLB from 4.826 MB to 3.303 MB (31.6%).
- Decoded texture pixels and geometry/rig/animation bytes retain source checksums; no visual-quality reduction or FPS gain is claimed.
- One Vite-fingerprinted model URL supports safe cache updates; procedural loading-failure fallback remains.

## Next four prioritized cycles
The user has reprioritized development toward the flight, planet exploration and open-ended immersion of **Infinity** in Black Mirror: USS Callister. Maintain an original universe and grow these capabilities incrementally, without claiming television-level realism or general NPC agency prematurely.

1. **Flight and landing depth:** refine craft/hangar geometry, approach cues, collision shapes and visible atmospheric descent; retain the complete manual round trip and measure rendering budgets.
2. **Nysa expansion:** enlarge/stream landing terrain, add exploration goals and richer scenery, then connect additional landing sites through actual shuttle travel. Preserve sample/mission saves.
3. **Ship and NPC agency:** navigation graph across rooms, local schedules/perception and executable crew tasks; deepen ship systems and failure recovery with deterministic tests.
4. **Realism and character polish:** distinct visually previewed crew, animation contact/IK, authored environments, lighting, sound and LOD against measured hardware budgets.

## Kestrel flight and guided landing (2026-10-13)
- Concourse bay/bridge launch, cockpit manual thrust/steering/boost/braking and target switching in a bounded sector.
- Erebus exterior, visible universe forge, Nysa ocean/coast/land/ice colors and separate drifting clouds.
- Low-speed approach guards, guided final touchdown, a visibly parked shuttle, survey on foot, boarding, return flight and docking.
- Fixed-step assisted flight, approximate planet/hull safety recovery, touch controls, pause/reset and transient location with compatible saves.
- Three-second guided transitions and a separate local survey sector; orbital mechanics, seamless whole-planet descent and terrain streaming remain future work.

## Nysa cockpit descent and ascent (2026-10-13)
- Orbital capture flows through cloud cover into a seven-second guided descent over the actual survey terrain, with radar altitude and a lit pad.
- Boarding shows a corresponding cockpit ascent before orbital departure and manual return.
- Original ship visibility survives repeated surface views; pause, quality switching, reset/reload and docking preserve the loop.
- This stages separate representations; full-planet streaming, freely piloted atmospheric flight and orbital-scale continuity remain future work.

## Nysa field exploration (2026-10-13)
- Expanded the bounded sector to 128×128 meters, retaining mesh/collider spacing and the original landing/sample/return loop.
- Optional resonance arch and raised-ridge weather station, physical props, scanners and saved field-log readings.
- Player-selected surface tracking, mission fallback and ship-readable scan history; no required side quest or new save version.
- Procedural scenery and authored observations, not dynamic weather, global streaming or an authored photorealistic landscape. Ground triangle count increases fourfold; device budgets remain future work.

## Kestrel approach instruments (2026-10-13)
- Braking wins over held thrust/joystick/boost; fixed-step forecasts share the actual assisted velocity model.
- Signed closing/drift readings, early BRAKE NOW warning and receding-target feedback.
- Three shared-geometry approach beacons with cruise/brake/ready colors, plus a projected actual-velocity diamond.
- Local guidance, not autopilot, collision avoidance or an additional landing site. Captured surface flight remains guided and global streaming is still future work.

## Hull-clear capture and hangar entry (2026-10-13)
- Shared Erebus exterior render/collision boxes with conservative craft clearance and union-safe recovery; the open bay accepts manual flight.
- Front/open-bay docking guards, five-second staged alignment/ingress and a smoothly aligned cockpit view.
- Nysa radial capture retains its safety margin instead of cutting a chord; existing surface descent/ascent and saves remain compatible.
- Approximate boxes/spherical clearance and guided paths, not swept rigid-body craft physics, general pathfinding or global planet streaming.

## Clear view and supplied model milestone (2026-10-14)
- Hidden-by-default information with INFO/H toggle, compact touch controls and locally retained view preferences.
- Walking third person with shared Mixamo skin, actual-distance animation, physical camera clearance and unchanged character-based interaction reach.
- First/third-person flight, uploaded spacecraft for parked/airborne views, and a textured uploaded station habitat above the working bay.
- Parked collision covers the imported craft; shared aft hatch/navigation sits outside the hull, with own-proxy exclusion during guided chase-camera clearance.
- Bounded local GLBs with deferred loading; station interiors remain procedural, and animated gears/cockpit replacement/hardware budgets remain future work.
- CGTrader email sign-in verified; compared free catalog previews and six detailed candidates. Sci-fi asset pack is the preferred next prop source after bounded acquisition and terms checks.

## Later
- Physically based and baked lighting, modular authored environments, LODs, GPU timing and measured device budgets.
- High-quality skinned characters, blend trees, IK, facial animation, interaction poses.
- Ship travel and docking, procedural planets with bounded streaming, persistent world state.
- Locally grounded agent memory/planning with validated action tools; optional server AI with cost caps.
- Multiplayer only after a stable authoritative simulation and abuse-resistant persistence exist.

Completion and evidence live in PROGRESS.md. Priorities may change based on observed bugs and performance.

## Auxiliary coolant and resupply milestone (2026-10-14)
- Two finite engineering cartridges reduce thermal load without bypassing a latched trip; normal Cooling/reset remains available.
- Optional Nysa supply-cache tracking, one-time refill, physical cabinet/crate collision and compatible v2 persistence.
- Fixtures remain generated. CGTrader acquisition is pending fresh verification and license/distribution review; no new imported model is claimed.

## Authored-model reliability milestone (2026-10-14)
- Failed craft/station downloads preserve playable fallbacks and retry on the next launch/boarding.
- Concurrent requests and repeated trips share successful sources, with one clone per actor and no frame-driven retry storm.
- New CGTrader prop import remains pending fresh verification and distribution checks; model detail/budgets are unchanged.

## Kestrel engine and banking feedback (2026-10-14)
- Throttle/boost emission, brake cutoff and guided downward lift plumes on the existing spacecraft.
- Bounded smoothed third-person orbital banking, pause/reset/camera cleanup and unchanged flight/saves.
- Stylized shader effects, not physical exhaust or a new model import; CGTrader acquisition remains blocked on verification.

## Nysa field-map milestone (2026-10-14)
- On-demand north-up relief chart with mission/survey/supply markers and surface player heading.
- Tap or keyboard-coordinate temporary waypoints, safe perimeter bounds and automatic mission fallback on arrival.
- Read-only ship overview, reachable close control and scrollable portrait/landscape layout; normal HUD stays hidden by default.
- Charted 128 m sector, not whole-planet mapping, fog-of-war or obstacle routing. CGTrader imports remain verification-blocked.

## Arch-pad flight-connected exploration (2026-10-14)
- Two selectable pads in Nysa's existing sector, PAD/L before capture, locked guided descent/ascent.
- Relocated parked craft/hull/beacon/hatch, matching extraction navigation and field-map markers.
- Flat, clear pad terrain; shared goals/saves and default safe ship reload.
- A second landing entrance rather than a second planet or seamless streaming. CGTrader import remains verification-blocked.


## Contextual crew briefing milestone (2026-10-14)
- Both officers expose objective, recorded-survey and actual-system topics, with containment-trip priority.
- Mission/save state remains authoritative; dialogue adds no repair actions or AI-service dependency.
- CGTrader authentication is restored after a browser restart using private cookie/local-storage export. Next authored-asset priority remains the reviewed free sci-fi props with license-compatible game packaging and measured texture/geometry budgets.

## Nysa vehicles and requested CGTrader environments (2026-10-14)
- Integrated the selected Cyber Biker/Turbo Bike, rover, Intrepid station, corridor/runway, bedroom, cockpit and flying ship as bounded local game resources.
- Expanded the survey sector to 256 meters with dunes, basalt mesas, wetland and highlands using shared render/collision geometry.
- Rideable bike/rover with collision-safe parking/dismount, speed slider, steering joystick and independent third-person look; slower distance-driven walking and running.
- Authored station collision, functional moving bulkheads and a connected bedroom/runway preserve the existing mission and flight loop.
- Next: measured real-device GPU/transfer budgets and LODs, terrain-following vehicle tilt/suspension, rider contact animation and further planet sectors. Vehicles currently run only on Nysa; staged orbital transitions, scripted officers and decorative weapons remain.

## Reported character, passage and visibility repair (2026-10-14)
- Correct lit character materials/hair and rest-pose retargeting; reduce bike to rider scale.
- Narrower standing collision, seam handling and clear widened launch lounge.
- User-selected bed resident in unchanged authored lying pose; generated window scenery with clear glass and additional corridor/cabin lighting.
- Next: address further user-observed defects, rider contact/wheel animation and measured device performance.

## Screenshot-specific Science passage and on-foot controls (2026-10-15)
- Widen the actual Deep Scan/Navigation passage and open its source doorway; keep console side routes clear.
- Mobile Run/Jump controls, physical grounded jumping and airborne/landing animation blending.
- Replace local run/jump motion with captured Mixamo clips after valid export authentication is restored.

## CGTrader rover surface fidelity (2026-10-15)
- Retain the selected creator's albedo/green panels and baked tangent detail in the local rover resource; preserve per-part shader coordinates and bake on final topology.
- Clamp atlas roughness to avoid mirror-like patches; preserve lit rubber/glass/metal response and bounded emission.
- Four distance-driven wheel pivots, 3.6 m length, six primitive draws and 27,928 triangles remain. No usable source motion clips were present.
- Next: terrain-following vehicle presentation and rider contacts, with measured real-device texture/GPU budgets before adding denser scenery.

## Vehicle terrain stance (2026-10-15)
- Sample the exact terrain triangles for bounded smoothed chassis pitch/roll and vertical fit on bike/rover.
- Attach the bike rider to the chassis seat transform; level camera roll and clear rider tilt when walking again.
- Keep reviewed CGTrader materials/resources intact. Upright collision proxies remain; wheel suspension, rock contact and hand/foot IK are future work.
- Next: measured device budgets and contact animation, followed by a bounded authored CGTrader scenery expansion.

## Turbo Bike engine feedback (2026-10-15)
- Match visual feedback to the selected CGTrader turbine/hover design; its wheel-named parts are steering components, not tires.
- Third-person idle/drive exhaust, immediate brake/dismount cutoff and frozen pause state; preserve reviewed textures and terrain-following rider pose.
- Next: richer authored surface scenery, measured device budgets and rider hand/foot contact. Turbo Bike remains a terrain-bound kinematic vehicle.


## Captured locomotion, rock travel and lounge repair (2026-10-15)
- Fresh authenticated Mixamo Walking/Running/Jump exports, retargeted without replacing reviewed biker geometry/materials/textures; actual-distance gait and physical jump phase. Local Riding and prior Idle remain.
- Rover maximum 14 m/s, collision-resolved rounded-rock assistance, individually sprung wheels, front steering and visible telescopic shocks. Bike banks into turns and its turbine pod moves independently of the smoothed frame/rider.
- Lounge overlapping floor and raised runway lip removed; underlay lowered below authored grating. Tiny steps no longer trigger airborne animation.
- Remaining: hand/foot contact IK, full tire-force dynamics, real-device GPU/memory budgets and more authored surface scenery. Current suspension is bounded raycast/spring presentation over upright kinematic proxies.


## Bike rider hand contact (2026-10-15)
- Reuse the reviewed CGTrader bike and biker, preserving all resource/image/material bytes and captured locomotion clips.
- Saddle/torso fit, two-bone arm IK, aligned palms and locally curled fingers keep both hands on source handlebars through banking. Bone lengths and normal walking pose are preserved; first-person/failure fallbacks remain.
- Remaining: foot placement/contact IK, captured riding variations, finger collision/forces, real-device memory/GPU budgets and authored Nysa scenery.


## Connected bow runway and launch airlock (2026-10-15)
- Attach the selected CGTrader runway to the station's open bow; connect the bedroom directly to the aft lounge. Keep its resident pose/scale and rear-window-only panorama.
- Park the authored jet at the start whenever aboard. Physical boarding and existing console shortcuts run an interlocked inner-close → outer-open → guided runway departure.
- Physical doorway/jet side clearances, pause, cockpit/chase views, return/reset parking and existing launch guards. No new stock resource or source animation.
- Remaining: unified orbital/local geometry, pressure/airlock simulation and guided return into the same local runway. Existing orbital docking remains staged.


## Visible runway return (2026-10-15)
- Guided turn outside the space door and reverse parking into the same reviewed CGTrader runway, leaving the jet facing outward.
- Full outer closure before station access/disembarkation; solid parked hull restored, clear exit lane, normal walking and repeat boarding.
- Cockpit/chase heading with independent look, pause/reset and retained mission progress. Existing textures, clips, draw counts and resources unchanged.
- Remaining: unified orbital/local world, pressure simulation, approach continuity and measured real-device bay budgets.
