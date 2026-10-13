# Ship rendering

The ship's opaque static cuboids are instanced at startup, grouped by material, 8-meter X/Z cell, shadow flags, layer, render order and culling mode. Each batch uses a shared unit cube with the source cuboid dimensions and local transform baked into its instance matrix. Material/UV coordinates, rotations, scaling and world placement are preserved; aggregate bounding boxes/spheres keep frustum culling enabled. Batches with one member stay as ordinary meshes.

Only unmodified one-segment BoxGeometry meshes directly attached to the scene are candidates. Doors, mutable console screens, meshes with children, transparent surfaces, segmented geometries and nested crew/forge/reactor objects remain independent. Physics colliders and interaction positions do not change. Old geometries are disposed only if no mesh in the scene still uses them; materials remain owned by the game. Batch creation precedes the ship visibility snapshot, so surface transfer hides/restores batches with the rest of the vessel.

Current result: 103 cuboids become 42 spatial batches; 103 formerly independent geometry objects retire before rendering. The unit cube geometry is shared. This is startup work, with no runtime rebuild, new dependency, asset or save-schema change. Independent screen materials can still update for relay restoration.

## Draw comparison (2026-10-13)

Chromium SwiftShader, 960×600, performance mode, completed genesis save, local yaw 0 at each viewpoint. Before source: `02df1e6`. These counters cover the direct render pass. They are viewpoint samples, not GPU timings or statistical FPS benchmarks.

| View / local X,Z | Draws before → after | Triangles before → after |
| --- | ---: | ---: |
| Bridge / 0,−5 | 90 → 78 | 21,916 → 22,120 |
| Concourse / 0,16 | 189 → 145 | 32,032 → 32,224 |
| Engineering / −16,11 | 173 → 148 | 39,140 → 39,392 |
| Observatory / 16,11 | 133 → 104 | 26,160 → 26,328 |

Draws decrease about 13–23%; submitted triangles increase less than 1% because frustum culling works at batch granularity. Reported software FPS was mostly 2 in both runs (engineering after reported 3); there is no verified FPS gain. Lighting/fragment work and software rendering still dominate this environment. A separate 640×400 Chromium high-mode shadow/bloom render and quality round-trip passed with its screenshot inspected. No high-mode before/after timing or real-hardware result is available.

With the dev server running, use `node scripts/render-qa.mjs` to sample the same views. An optional JSON output path writes the result; a following argument supplies an existing screenshot directory. The probe seeds its own isolated browser save. Dev-only `?qa` counters are stripped from production. Do not use final compositor-pass counters as complete high-mode scene totals.

## Limits and next work

This helper owns canonical static cuboids in the current scene, not arbitrary geometry or dynamic objects. Future changes that animate a direct scene box must explicitly exclude it from batching. Spatial batching trades some per-object culling for fewer draws. Hardware GPUs/mobile, GPU timing and real pointer lock remain unverified. Next: hardware/GPU timing, terrain materials and authored character assets when valid Mixamo access is available.


## Performance-mode light budget (2026-10-13)

The ship has nine original point lights. High mode renders that full rig. Performance mode hides those originals and renders four fixed proxy point lights selected near the camera. Selection scores intensity, squared distance and finite-range attenuation, with a small fallback score and 20% retention bias. Retained sources keep their slots even when ranking changes. A replacement fades the previous source to zero over 150 ms, relocates at zero, then fades up over 150 ms; elapsed time can complete both stages in one slow frame. Returning aboard or changing quality initializes the selection at the current camera position. Zero-intensity slots remain visible to preserve a constant shader light count during handoffs.

Each proxy copies its source position, color, intensity, range and decay after the power/thermal update, so containment color and habitat dimming remain live. The surface hides both rigs, and quality changes while away do not enable ship lights or restore an obsolete visibility snapshot on extraction. Ambient/sun/ceiling lighting and emissive strips/screens are separate from this budget. No physics, progression, save schema, dependency or asset changes are required.

This is a camera-local approximation: distant room spill can differ, a moving camera can reveal brief dimming during handoffs, and source selection is not occlusion-aware. High remains the reference for full lighting fidelity. It reduces the point-light evaluation count, not geometry, draw calls or every fragment cost. Shader-count probes and screenshots are software-WebGL evidence, not hardware timing. No measured FPS gain is claimed.

Use `node scripts/render-qa.mjs .local/qa/light-sample.json .local/qa/light-screens` with an existing screenshot directory and the dev server running. The isolated probe now waits for settled handoffs and records the compiled direct-light loop counts observed through WebGL `useProgram`, as well as source/proxy counts and viewpoint draws. The numeric loop size is observed from Three.js's processed shader source; no shader or renderer internals are exported by the game. Append `high` as the fourth argument for the full-rig probe. The 960×600 four-view probe observed four direct-light evaluations in performance mode and nine in High, with zero page exceptions. Performance-mode draws/triangles match the preceding release; High counters cover the final compositor pass only. All game QA hooks remain development-only.
