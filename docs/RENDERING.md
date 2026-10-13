# Static ship batching

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

This helper owns canonical static cuboids in the current scene, not arbitrary geometry or dynamic objects. Future changes that animate a direct scene box must explicitly exclude it from batching. Spatial batching trades some per-object culling for fewer draws. Hardware GPUs/mobile, GPU timing and real pointer lock remain unverified. Next: profile lighting/fragment cost, then terrain materials and authored character assets when valid Mixamo access is available.
