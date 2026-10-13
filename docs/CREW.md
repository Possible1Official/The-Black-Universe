# Local crew behavior

Vega patrols the bridge and Ion patrols engineering using two hand-authored waypoints per officer. These are deterministic local state machines, not LLM agents, a navigation mesh, or general-purpose AI.

Each officer has a Rapier kinematic capsule and character controller. Waypoint commands are checked against physical ship geometry and the player's capsule. Officers turn in place before walking, pause at endpoints, and stop/face a visitor within 1.8 meters. Once attending, they resume patrol after the visitor moves beyond 2.2 meters; this prevents rapid stop/start chatter. A conversation holds movement and turns the speaking officer toward the player.

Sustained lack of forward progress for two simulation seconds reverses the local route after a short wait. This handles a local blockage; it does not find an arbitrary route around obstacles. Walking animation advances from actual distance traveled, with opposing arm/leg swings and a blend to rest. The meshes remain procedural placeholder androids without Mixamo skinning, IK, facial animation, or authored motion capture.

Simulation runs at the game's existing fixed 60 Hz step. The existing frame-time cap can slow simulation under very low rendering rates; no real-device performance claim is made. Crew behavior is transient and resets when loading the game; saved mission progression now uses v2 with legacy v1 migration (see POWER.md).

Tests: `tests/patrol.test.ts` covers bounded routes and endpoint waits, player attention, resumption, obstruction recovery, turn-rate/angle wrapping and attention hysteresis. `scripts/browser-qa.mjs` exercises rendered patrol displacement, yielding, solid body contact, crew dialogue and access-console collision alongside the original mission and mobile checks. Headless pointer lock is emulated; touch movement is dispatched in a mobile browser context.
