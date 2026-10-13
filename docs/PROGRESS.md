# Development progress

## 2026-10-13 · Foundation released

Repository started empty. Built-in hourly continuation confirmed enabled. Stack selected: TypeScript + Three.js + Rapier + Vite; private Sites delivery (Pages setup was blocked). No Vercel or Supabase.

Implemented: explorable four-area ship, first-person movement/jump/sprint, fixed-step Rapier capsule, physical walls/floors/bulkheads, auto-reopening occupied doors, bridge consoles, three power relays, forge activation, generated orbital world and scan, two temporary articulated android officers with progression-aware dialogue, local mission persistence, reset/pause/settings, synthesized audio, desktop and touch input. Cinematic rings, PBR metallic surfaces, procedural panels, real lights, a shadowed spotlight, bloom and a mobile-default performance mode.

Verification so far: TypeScript/production build passes; three meaningful state tests pass (relay/genesis gating, malformed saves and round trip, crew responses). Production dependency audit: zero reported vulnerabilities. Python importer and JS helper syntax checks pass. Desktop Chromium software-WebGL exercised movement, floor/window/closed-door collisions, opening and traversing a doorway, locked genesis, all relays, genesis, and scan dialogue. Desktop screenshots inspected. Save reload/corrupt-save checks pass; mobile Chromium emulation passes responsive viewport, visible controls, and movement through actual dispatched touch events. No browser exceptions occurred. Hardware touch devices and pointer-lock capture were not validated; headless pointer lock was emulated for keyboard checks. Dev-only QA observability is stripped from production; no bearer token is in the built game.

Assets: upstream MixamoHarvester inspected and pinned, bounded importer prepared; screenshot credential catalog probe returned HTTP 500. No Mixamo asset was acquired. Asset export integration is not yet verified against a valid account. Crew are placeholders, not realistic people or AI agents. Planets are currently orbital visual objects, not landable surfaces.

Delivery: GitHub Pages creation rejected with HTTP 403 from the installed integration. A private Sites project was created; `.openai/hosting.json` records its identity. GitHub remains source authority and Actions runs CI only. Sites helper files are unavailable in this environment, so a portable, stdin-only mirror helper is included. Private Site publication succeeded on 2026-10-13 at 01:17:14 UTC, serving source merge `64cc3ec753058f82d87bf57fc68319daa3f3ace3`. Play: https://the-black-universe-erebus.harshit-0207.chatgpt.site . PR #1 was automatically merged after GitHub CI passed; main CI also passed. Tag `playable-v0.1.0` preserves the release.

Performance limits: production JS is ~2.76 MB uncompressed / ~966 KB gzip, including inline Rapier WASM. High-detail rendering checked visually, but no real-device GPU benchmark or photorealism claim. Software rendering is slow; performance mode directly renders without bloom/shadow passes and caps pixel ratio to one. Further instancing, lighting optimization, asset streaming and actual device testing are required.

Rollback starting point: `foundation-baseline` / `dd4cb58`; playable rollback tag: `playable-v0.1.0`. Next priority: valid character acquisition and animation integration; if access is blocked, measured visual/lighting and crew-physics improvements.

## Release records

- Implementation PR: https://github.com/Possible1Official/The-Black-Universe/pull/1
- Passing main CI: https://github.com/Possible1Official/The-Black-Universe/actions/runs/38331268412
- Built-in hourly task created and enabled; first scheduled cycle 2026-10-13 01:58:11 UTC. No duplicate tasks. Future runs depend on quota/access/runtime availability.
- Release bookkeeping adds a Vite-cache ignore entry and records publication evidence; no gameplay source changes.
- Live production browser smoke check passed with site-scoped service access: HTTP 200, title `The Black Universe · Erebus`, physics-ready canvas, enter-game UI, and zero page exceptions. Private access header requires `OAI-Sites-Authorization: Bearer <token>`; never place this service token in source or automation prompts. Anonymous visits correctly require sign-in. Production screenshot saved locally under ignored `.local/qa/production.png`.

## 2026-10-13 · Crew patrol and physical interaction cycle

Starting SHA: `f89548f2ab60323f71198923cebcfb6d76ecc0e7`; rollback tag: `rollback-20261013-crew-patrol`. No open PRs or dirty source were present when this cycle began. No valid local Mixamo credential was available, so the roadmap's crew-physics/animation fallback was selected without trying to reuse screenshot credentials.

Implemented: two-waypoint patrols driven through Rapier kinematic capsules; turn in place before walking; endpoint waits; proximity attention with hysteresis; smooth facing during conversation; route reversal after two seconds without forward progress; movement-driven opposed arm/leg animation with a blend to rest. Added missing colliders for access consoles, bridge dais and seats. Pause/dialogue now clear held touch/look input and cached horizontal movement; movement controls ignore dialogue state.

Validation: baseline three tests and production build passed. Updated eight tests pass, covering patrol bounds/waits, visitor attention/resumption, blocked-route reversal, angle wrapping and turn rates, hysteresis, progression/save invariants and crew dialogue. Full Chromium software-WebGL QA passes for rendered patrol displacement, yielding without drifting, solid crew/player contact, crew conversation, access-console collision, and the existing movement/window/floor/door/mission/genesis/scan/save/corrupt-save flow. Mobile emulation passes touch movement, responsive layout and held-input cleanup across pause/resume. No page exceptions. Crew dialogue screenshot visually inspected. TypeScript/Vite build passes (~2.77 MB JS / ~967 KB gzip); the existing bundle-size warning remains. Dev observability is absent from production output.

During verification, excessive downward NPC displacement produced sideways sliding at the bridge step. Corrected it to the player controller's small fixed-step ground bias, measured progress along the intended direction for blocked-route recovery, and verified the corrected movement in-browser. No claimed GPU/FPS improvement; hardware mobile performance and real pointer lock remain unverified.

Limitations: procedural androids, local waypoint state machines and scripted dialogue only; no Mixamo skinning, arbitrary navigation/pathfinding, LLM planning, IK or facial animation. Mission save v1 is unchanged; transient crew state restarts on load. See CREW.md. Release follows the passing PR merge to the existing owner-private Site; native deployment/version provenance records the final merged SHA and publication outcome. Existing hourly scheduling is unchanged and no duplicate task was created.

Next improvement: power distribution and containment diagnostics with visible consequences, then surface exploration; a valid Mixamo character pipeline remains an outstanding parallel priority when asset access becomes available.
