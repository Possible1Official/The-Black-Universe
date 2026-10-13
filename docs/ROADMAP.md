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

## Later
- Physically based and baked lighting, modular authored environments, LODs, GPU timing and measured device budgets.
- High-quality skinned characters, blend trees, IK, facial animation, interaction poses.
- Ship travel and docking, procedural planets with bounded streaming, persistent world state.
- Locally grounded agent memory/planning with validated action tools; optional server AI with cost caps.
- Multiplayer only after a stable authoritative simulation and abuse-resistant persistence exist.

Completion and evidence live in PROGRESS.md. Priorities may change based on observed bugs and performance.
