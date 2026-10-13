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

## Next four prioritized cycles
1. **Character polish:** inspect walking/idle transitions on hardware, add a visually distinct second crew member after preview, and evaluate foot contact/IK and LOD before increasing asset budgets.
2. **Ship simulation expansion:** deepen the new power/containment model, ambient machinery, better doors, minimap and navigation aids. Preserve completed saves through a versioned migration.
3. **Exploration polish and performance:** improve terrain materials/lighting and measure surface/ship rendering before expanding the biome. Evaluate instancing and frame pacing; keep the existing mission/navigation loop stable.
4. **NPC agency:** navigation graph, schedules, perception and task execution, with explicit goals and failure recovery. Add deterministic simulation tests. Dialogue can remain local until a properly authenticated backend exists.

## Later
- Physically based and baked lighting, modular authored environments, LODs, GPU timing and measured device budgets.
- High-quality skinned characters, blend trees, IK, facial animation, interaction poses.
- Ship travel and docking, procedural planets with bounded streaming, persistent world state.
- Locally grounded agent memory/planning with validated action tools; optional server AI with cost caps.
- Multiplayer only after a stable authoritative simulation and abuse-resistant persistence exist.

Completion and evidence live in PROGRESS.md. Priorities may change based on observed bugs and performance.
