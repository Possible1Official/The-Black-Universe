# The Black Universe

An evolving browser science-fiction game: explore the starship **Erebus**, restore its power network, and awaken a colossal **universe forge**.

**Play:** https://the-black-universe-erebus.harshit-0207.chatgpt.site

This is a playable foundation toward an ambitious universe simulation. It does not yet provide television-level photorealism, open planetary surfaces, multiplayer, or general-purpose AI NPCs.

## Run

Node.js 22+: `npm ci`, then `npm run dev`. Open the printed URL. `npm test` verifies progression/save invariants; `npm run build` checks TypeScript and produces static `dist/`. `npm run preview` serves that build. With the dev server running, `npm run test:browser` exercises the mission and collision flow in Chromium (first install it with `npx playwright install chromium`).

## Expedition 001

Enter the Erebus. Move with WASD/arrows, look with the mouse, sprint with Shift, jump with Space, and interact with E. Escape pauses. Touch devices have a left movement joystick, right-side drag camera, and an E action button. Open menu settings for performance mode, audio and mission reset.

1. Walk to the forward bridge. Speak to Officer Vega and activate the navigation relay.
2. Use the access panel beside the port bulkhead to open engineering. Activate the power relay near the reactor.
3. Open the starboard bulkhead and activate the observatory relay.
4. Return to the central bridge console and initialize the architect. A new world, Nysa, appears outside.
5. Scan it from the bridge and speak with the crew after genesis.

Progress saves locally on this browser/device; corrupt or unavailable storage fails safely. Reset is in the menu. Surface landing is planned, not implemented.

## Technology and scope

TypeScript + Three.js/WebGL 2 + Rapier WASM + Vite. Fixed-step kinematic capsule movement with floor/wall/door collision, anti-crush bulkheads, procedural metallic surfaces, real lights/shadows, restrained bloom, animated forge rings and local synthesized ambience. No runtime external assets, keys, database or AI service. Typography uses local system fonts; no external runtime requests are required. Skinned character import is pending valid Mixamo access; crew currently use temporary articulated android meshes and state-aware scripted dialogue, physical local patrols, and proximity attention.

Desktop modern Chrome/Firefox/Edge with hardware acceleration is recommended. Touch controls are available; actual mobile GPU performance still needs device testing. High mode caps rendering resolution at 1.75×; performance mode uses 1×, no shadow map and no bloom. Startup downloads include the physics WASM bundle (~1 MB compressed initial JS). Further streaming/LOD and asset-budget work is on the roadmap.

See [local crew behavior](docs/CREW.md) for the implemented patrol model and its limits.

## Ongoing development

Read [roadmap](docs/ROADMAP.md), [progress/evidence](docs/PROGRESS.md), [automation protocol](docs/AUTONOMY.md) and [Mixamo asset status](docs/ASSETS.md). Built-in hourly tasks initiate development; GitHub Actions tests the game. Owner-private Sites hosting serves a mirrored copy of the tested GitHub source. Pages setup was blocked by the integration permission (HTTP 403). Each cycle uses a branch/PR and merges passing changes. Rollback retains Git history and baseline tags.

No Vercel or Supabase is used. Credentials never belong in the public repo or browser bundle.
