# Fixed-step frame pacing

The earlier movement loop accepted at most 50 ms per render. At 10 FPS that simulated only half the elapsed time, slowing the player, crew patrols and door motion. The new frame clock accumulates elapsed time into 60 Hz physics steps, accepts at most 250 ms per rendered frame and runs no more than 15 steps. Each Rapier collision move remains 1/60 second; the player never crosses a wall in one enlarged catch-up step.

At 4 FPS and above, a steady frame stream preserves simulation time. Longer stalls drop excess time to avoid an unbounded backlog or a large post-stall burst. This deliberately slows simulation below that threshold; it does not make a 2 FPS device run in real time. The power model already uses the same 250 ms catch-up budget. Rendering FPS, GPU cost, draw calls and asset size are not improved by this fix.

Pause, dialogue transitions and ship/surface transfers reset the movement remainder and discard the first movement interval after the transition. Resume also discards its first power interval and clears the fractional power remainder at pause, preventing time spent paused from being applied to newly resumed gameplay. Power continues during active dialogue. Cosmetic animation uses a bounded elapsed interval instead of the old 50 ms cap. Toast expiry follows elapsed wall time up to one second per frame, so notifications do not linger solely because rendering is slow. Jump/fall velocity still freezes with the physics simulation during pause. Quick Space taps are buffered for 0.2 simulation seconds instead of being erased by key-up before the next physics tick. Grounded input launches once; airborne intent expires, auto-repeat does not requeue, and modal/pause transitions clear it.

## Evidence (2026-10-13)

Same Chromium SwiftShader software renderer, 480 × 320 viewport, performance mode, keyboard walking along the empty habitat centerline. A single short before/after sample is a regression reproduction, not a hardware benchmark or statistical FPS comparison:

| Build | Wall interval | Displacement | Average speed | Reported FPS |
| --- | ---: | ---: | ---: | ---: |
| Before (`ac9dd19`) | 3.031 s | 2.876 m | 0.949 m/s | 7 |
| After | 3.142 s | 9.460 m | 3.011 m/s | 7 |

Configured walking speed is 3 m/s with smoothed acceleration. Browser scheduling and the evaluation interval can include a partial render interval; these short wall measurements are approximate. Deterministic tests provide the stronger comparison: identical Rapier position and jump peak after three seconds at 120, 60, 30, 10 and 4 render FPS, with floor support and wall blocking; a 100-second stall still produces only 15 steps. Pause/reset, invalid deltas and jump buffering also have coverage. The desktop browser suite schedules frames no faster than 10 FPS to exercise catch-up and short-tap behavior independently of renderer speed.

With the dev server running, reproduce the measurement using `node scripts/motion-qa.mjs`; an optional output path writes JSON. Headless pointer lock is emulated in this probe. Dev-only `?qa` snapshots expose step counts, dropped movement time and renderer draw counters; these hooks are stripped from production. Hardware GPUs, real pointer lock and actual mobile devices remain unverified. Representative performance-mode counters from this cycle: bridge at X 0 / Z −5 used 90 draw calls / 21,916 triangles; Nysa landing used 21 / 9,728. These are viewpoint samples, not GPU timings. The next rendering cycle should reduce measured draw/lighting cost before expanding visual scope.
