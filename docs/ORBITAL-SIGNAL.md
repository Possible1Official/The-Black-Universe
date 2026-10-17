# Wayfinder orbital expedition

Recover **Archive04** inside the Signal Vault on Nysa. In **J / FIELD LOG**, choose **Track Wayfinder in orbit**. You can select it aboard, on Nysa, or during manual spaceflight. Launch/board Kestrel normally; guidance switches to the relay during manual flight. The field log is also available during manual flight, freezing motion while open. Guided launch/capture/descent/docking still keep the log unavailable.

Wayfinder sits at sector **X−420 / Y95 / Z−360**, away from the usual Nysa corridor. Fly toward its cyan ring and adjust pitch toward the actual visible target; the label reports altitude95m in the sector frame. Use a modest speed demand for the final approach. Brake to **6m/s or less within45m**, point Kestrel's nose within20° of the relay, then press **E** or the touch interaction button. Receive for **three active seconds**. Nose alignment uses steering, independently of camera free look.

Scan conditions are rechecked every physics step. Excess speed, range, lost alignment, an opaque station envelope or Nysa's globe interrupts reception; start again with E after correcting it. Repeated E during reception does not restart its clock. Pause and field-log conversations freeze the clock. This is a proximity receiver interaction, not docking, autopilot or landing. **T / TARGET** cancels relay tracking and restores the existing Nysa/Erebus destination; T then switches those destinations normally. Landing-pad controls remain available with normal Nysa guidance.

Completion saves **Archive05**, turns the receiver indicator green and adds the decoded record to the field log and officer survey debrief. E near the relay can reread it. Reload starts safely aboard with discovery and older survey/rover/ECHO progress retained; tracking and an in-progress scan are transient. Mission reset clears the archive. Old/malformed saves default unrecovered; the saved flag requires valid recovered Vault/network progress.

The story reports evidence of another biosphere. **Another planet is not yet reachable.** Wayfinder adds an optional flight/exploration objective in the existing sector.

## Physical appearance and limits

The payload reuses the incorporated desanlisadrien1 CGTrader Sci-fi asset-pack canister, uniformly fitted to2.4m height with its original geometry/material/image references. The source is a static prop with no animation. Game-authored solar-panel shapes, bus bars, a connected cross-spar, aerial and small indicator make the orbital relay assembly. These parts are static; no source satellite rig or deployment animation is claimed. Its visible span is5.8m, with a7m spherical flight safety hull including Kestrel's conservative3.5m clearance. Embedded/fast contact cuts thrust and recovers outward using the existing flight safety model. It remains visible as a physical object before decryption; imported-payload failure retains a visible cylinder fallback. A subsequent launch retries failed loading; successful loads are cached.

Loaded potential geometry:1,650 triangles/six draws, including1,430 existing source triangles. Extra generated parts add220 triangles; the cylinder fallback gives268 total triangles/six draws. No new image map, light, shadow map, audio source or Rapier collider. The existing442,261-byte canister resource now loads on launching spaceflight if not already cached from other props; no new packaged model file or changed asset hash. Clones share existing geometry/maps. One extra sphere-distance collision check per manual physics step, plus bounded scan/target visibility math against existing station boxes and Nysa. The existing stopping forecast remains capped at300 steps and updates through navigation, with the relay's45m/6m/s limits. No physical-device FPS/GPU memory or exact wing/antenna collision simulation is claimed.

## Evidence

`tests/orbital-signal.test.ts` verifies scan gates/timing/cancellation, pause/idempotence, actual piloted final approach and safety contact, station/globe occlusion, additive save compatibility, actual packaged source geometry/sharing/bounds/retry and restoration of the original landing markers.

`scripts/orbital-signal-qa.mjs` uses real E/flight/brake/menu controls for the changed expedition and a temporary fixture to skip unchanged launch/sector travel and seed previous archives. `--approach-only` checks only controlled final approach without hull contact. Mobile-emulated browser and source-material inspection evidence is recorded in PROGRESS; this is not a full physical-device or hosted-render test.
