# Asset pipeline

## Current release
Ship, forge, planets, panels, floor and terrain maps remain procedural. Vega and Ion use the same locally bundled **Ely by K. Atienza** character, each with an independent skeleton and animation mixer. Procedural articulated androids remain a failure fallback. These are game characters with captured motion, not photorealistic people or general AI. Runtime uses no Mixamo account/token or remote CDN.

Kestrel's cockpit/landed mesh, exterior Erebus hangar, orbital Nysa/atmosphere and forge scenery are generated with Three.js primitives. Nysa's globe-space color map is 1024×512 RGBA and its transparent cloud map 512×256 RGBA (2.5 MiB CPU pixels total; mip/driver allocation is not measured). They are generated once without downloads. The same color map is shared with the bridge-view planet. No new licensed asset or Mixamo authentication is needed for this flight milestone; craft/exterior detail remains procedural and is not claimed to be photorealistic.

Surface descent/ascent reuses the cockpit and survey terrain rather than allocating another environment. A small generated emissive torus marks the landing pad; a CSS gradient cloud veil covers the orbital/local representation switch without an image download. No additional external asset, texture map or licensed character is introduced. This is staged guided flight, not photorealistic clouds or global planetary geometry.

## Selected asset and terms
On 2026-10-13 the user completed Adobe verification and sign-in through the explicitly requested Playwright browser. Before any export, full 3D previews of Ely, Exo Gray, Vanguard and Eve were inspected. Ely's visible face, fitted science-fiction armor and orange accents fit the Erebus crew; Vanguard's helmet/bulk better suit security, Exo has a plainer dark suit, and Eve is a promising distinct crew appearance. Only Ely was downloaded.

Adobe's [Mixamo FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html), checked 2026-10-13, states: “You can use both characters and animations royalty free for personal, commercial, and non-profit projects” including “Create video games.” Asset usage remains governed by Adobe/Mixamo terms, separately from the MIT harvester tooling and project code. This game bundles one converted character for game use; original FBX files and standalone asset packs are not distributed. Do not assume the character is MIT-licensed or independently redistributable.

- Character ID: `f7b85d05-5f1c-47d8-9770-9a1a054bd6f6`, Ely By K.Atienza.
- Idle ID: `c9c79c65-b96c-11e4-a802-0aaa78deedf9`, 8.333 seconds at 30 FPS.
- Walking ID: `c9c609a9-b96c-11e4-a802-0aaa78deedf9`, 0.867 seconds, source stride 1.313094 m.
- Source file: `src/assets/ely.glb`, **3,303,208 bytes**, SHA-256 `629f90db03e60ea76bbeb5e273d245d39362073ec81eecd922b60a541c96434b`. Vite publishes one fingerprinted `dist/assets/ely-<hash>.glb`; no duplicate unversioned model is shipped.
- Geometry: 14,808 triangles, one skinned primitive/material, 67 joints, height about 1.790 m.
- Four embedded 1024×1024 lossless WebP maps: diffuse, normal, specular and glow; bounded metallic .35 / roughness .55, backface culling, no external image URI. `EXT_texture_webp` requires native WebP support in the recommended modern browsers; unsupported decoding keeps the procedural fallback.
- `public/assets/crew/provenance.json` records pinned tooling, source IDs and raw download sizes/hashes. Raw files stay under ignored `.local/mixamo-assets/`.

Conversion: Blender 4.3.2, `blender -b -t 2 --python scripts/convert-mixamo.py`. Import skin and both clips; transfer matching bone actions to one armature; remove imported duplicate rigs and bind-pose action; preserve vertical hip bob while removing both ground-plane hip translation curves; export NLA tracks as named Idle/Walking in a self-contained GLB. Export uses regular glTF, no Draco dependency. Model/clip total meets <8 MB / <40k triangles / <=2K textures. All 67 joints are retained; no LOD or finger-bone reduction yet.

The converter now writes the intermediate PNG GLB to ignored `.local/mixamo-converted/ely.glb`. Run `node scripts/optimize-crew.mjs .local/mixamo-converted/ely.glb src/assets/ely.glb public/assets/crew/optimization.json` afterward. FFmpeg 7.1.5 / libwebp lossless compression reduces the former 4,825,788-byte GLB by **1,522,580 bytes (31.6%)**. The optimizer decodes source and compressed textures to RGBA and requires byte-for-byte pixel equality before writing output; it repacks aligned buffer views and preserves every non-image buffer byte. The report includes pixel hashes, per-map budgets and all retained geometry/rig/animation view checksums. These are artifact byte savings, not measured network transfer time, GPU memory savings or FPS improvement; decoded texture dimensions and rendering work remain the same. No new package or runtime decoder is added.

Runtime: GLTFLoader loads once asynchronously from the game's own origin, using Vite's content-fingerprinted URL so subsequent builds can change the model safely in browser caches. SkeletonUtils clones two rigs while sharing geometry/textures. Each AnimationMixer blends Idle/Walking using the existing movement blend. Walking phase follows actual Rapier travel, not elapsed time while blocked; idle and physical movement pause together. Loaded skinned meshes disable frustum culling to avoid stale animated bounds for these two actors. Physical capsules, dialogue anchors, perception, watch routing and saves retain their existing behavior. No run clip, facial animation, foot IK or hardware performance gain is claimed. Startup adds ~3.3 MB of asynchronous local asset data; slow/failed loading retains the procedural actors.

## MixamoHarvester
Source: https://github.com/paulpierre/MixamoHarvester (MIT tooling), pinned revision `0f9a38aa15a79110016a0a1df15f0863c8dd9e12`. Mixamo asset terms are separate from the tool's license; inspect them before distribution.

Earlier screenshot-token probing returned HTTP 500 and shared-browser activation was unavailable. The later user-requested Playwright sign-in succeeded after email verification; authorized Mixamo API request headers supplied a fresh bearer **in process memory only** to the bounded importer. Both exports/downloads succeeded through pinned MixamoHarvester operations. No password, verification code, bearer, browser session file or raw FBX is included in Git or the runtime bundle. The temporary authenticated browser is closed after acquisition.

`python scripts/mixamo-import.py --catalog` uses pinned upstream catalog requests. `--character ID --motion Idle --motion Walking` invokes upstream export/download operations for a bounded selection. Install Python dependencies in a local virtual environment: `pip install requests tqdm tenacity`. Supply `MIXAMO_BEARER_TOKEN` through your local environment or secret manager, never shell history, tracked files, or browser code. The bounded skin export and Idle/Walking download path were verified with this account; broader formats/characters/exports are not verified. Sanitized errors suppress upstream signed-URL logs, and provenance records selected product IDs and source hashes.

Next: preview a distinct second character, measure real GPU/transfer costs, and evaluate LOD/foot-contact improvements before adding more clips or larger assets.

Never import all characters/animations just because upstream supports it. Raw downloads belong in ignored `.local/`; only verified, optimized, properly licensed game assets belong in `public/assets/`.
