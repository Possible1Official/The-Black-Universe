# Asset pipeline

## Current release
Ship, forge, planets, panels, floor and terrain maps remain procedural. Vega and Ion use the same locally bundled **Ely by K. Atienza** character, each with an independent skeleton and animation mixer. Procedural articulated androids remain a failure fallback. These are game characters with captured motion, not photorealistic people or general AI. Runtime uses no Mixamo account/token or remote CDN.

Kestrel's cockpit/landed mesh, exterior Erebus hangar, orbital Nysa/atmosphere and forge scenery are generated with Three.js primitives. Nysa's globe-space color map is 1024×512 RGBA and its transparent cloud map 512×256 RGBA (2.5 MiB CPU pixels total; mip/driver allocation is not measured). They are generated once without downloads. The same color map is shared with the bridge-view planet. No new licensed asset or Mixamo authentication is needed for this flight milestone; craft/exterior detail remains procedural and is not claimed to be photorealistic.

Surface descent/ascent reuses the cockpit and survey terrain rather than allocating another environment. A small generated emissive torus marks the landing pad; a CSS gradient cloud veil covers the orbital/local representation switch without an image download. No additional external asset, texture map or licensed character is introduced. This is staged guided flight, not photorealistic clouds or global planetary geometry.

Nysa's expanded sector keeps existing generated ground maps and materials. It adds a basalt frame and primitive weather mast/dish with two emissive scanners, retains instanced rocks/vegetation, and moves distant silhouettes beyond the new boundary. The 96×96 ground grid contains 18,432 triangles; no external landscape, texture, character or runtime service is added. Field readings are authored strings, not an external science/weather feed. Hardware budgets remain unmeasured.

Approach guidance reuses one 768-triangle torus geometry across three beacon meshes instead of one, with one separate basic material so status colors do not recolor Erebus lights. Two additional visible instances add up to 1,536 submitted triangles; culling determines actual view work. The velocity diamond is CSS/DOM, and the stopping forecast is bounded local CPU work. No new model, texture, account or asset download is added; no hardware FPS benefit is claimed.

Erebus's seven existing exterior boxes now share one dimension table with manual collision and guided docking validation. Three small procedural floor-strip boxes mark the hangar interior (36 additional triangles); no texture, character or imported craft asset is added. Collision uses conservative clearance around primary boxes; lights, floor markings and other trim remain decorative. The camera and orbital capture reuse the existing scenes. The existing orbital hemisphere ground fill is raised and the existing key light repositioned toward the front for bay readability; light count is unchanged. No hardware rendering-speed improvement is claimed.

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

## User-supplied spacecraft and station (2026-10-14)

The user supplied `space_ship_final.fbx` and `blend.zip` for this game. Source hashes and exact output budgets are recorded in `public/assets/supplied/provenance.json`. No original creator, listing or explicit public redistribution license accompanied the attachments; these assets are not asserted to share the code's MIT license. Original FBX/Blend/ZIP and temporary exports stay ignored under `.local/`. No credentials or authenticated browser state are distributed.

Inspected archive entries/expanded byte count and rejected unsafe paths/symlinks before extraction; opened Blender with auto-execution disabled. Both models were rendered and inspected before selecting components. The craft contains three oversized reference objects plus its detailed assembly; the game exports the 74 detailed components, removes the oversized references, applies bounded .12 decimation to components above 1,000 triangles, joins static geometry and normalizes the nose/scale. The station scene contains cinematic lasers, drones and fighters; the game selects 18 habitat/door/window/column/railing components. Modern Blender loses the old Blender Internal materials, so supplied UV color/normal/roughness maps are rebuilt as Principled materials. Scripts: `scripts/convert-supplied.py` and the existing lossless WebP optimizer.

| Asset | Game geometry | Download | Materials/textures | Use |
| --- | --- | --- | --- | --- |
| Craft | 50,857 triangles, one mesh / 20 primitives; 4.921×2.832×6.600 m | 4,296,152 bytes | Original material colors, bounded metallic/roughness; FBX includes no image maps | Kestrel parked/orbital/surface-flight views |
| Station | 9,256 exported triangles, one mesh / 7 primitives; 87.900×27.900×120.000 m | 2,742,072 bytes | 15 embedded 512×512 WebP maps | Elevated Erebus exterior habitat above the functional docking bay |

Station's base Blender mesh reports 4,646 triangles; evaluated glTF export is 9,256, which is the authoritative rendering budget. Reducing its source 2K maps to 512 pixels is a deliberate distance-view quality tradeoff. Lossless WebP compression then reduces the resized PNG GLB from 4,132,380 to 2,742,072 bytes (33.6%), with decoded pixels checked equal to that resized intermediate, not to the original 2K source. No hardware FPS claim. Craft export is static: source turrets, fans and landing gear are not animated; first-person cockpit remains generated. Imported station rooms are not separately walkable yet.

Vite ships one fingerprinted URL per model. The shared crew skin loads once for three independent rigs. Craft and station requests are deferred until flight begins; parked/orbital/surface craft clones share resources. Failed loading preserves generated fallbacks. The uploaded craft's half-extents fit the existing 3.5-meter axis clearance; the station adds a conservative elevated collision box. These approximations do not reproduce each mesh surface, rotated wing envelope or hollow section.

The parked craft now has a 4.94×2.84×6.62-meter physical envelope rather than the earlier narrow generated center-body collider. Its aft boarding anchor and mission waypoint are outside that hull at local Z +3.5. Walking/camera queries use the solid hull; during guided flight, chase-camera queries exclude the craft's own parked proxy/hatch to avoid a false camera collapse at touchdown. Other surface obstacles remain camera blockers.

## CGTrader sourcing review (2026-10-14)

Email sign-in through the requested Playwright browser succeeded after user-provided verification. The temporary authenticated browser was closed without exporting cookies/session state. The Free filter was explicitly selected (the nominal `/free-3d-models/space` URL initially displayed both paid and free models); subscription offers were not treated as free downloads. More than a dozen free catalog previews and six detailed listing previews were compared before choosing a preferred future source. No additional CGTrader model was downloaded in this release, which integrates the two supplied attachments.

| Previewed candidate | Assessment / next action |
| --- | --- |
| [Sci-fi asset pack · desanlisadrien1](https://www.cgtrader.com/free-3d-models/space/other/scifi-asset-pack) | Preferred next prop source: cohesive yellow/gray consoles, crates and machinery; 19 assets, textured and game-oriented, Royalty Free (no AI). Acquire only a bounded prop selection and inspect actual files/terms. |
| [SpaceShip · jazoone](https://www.cgtrader.com/free-3d-models/space/spaceship/spaceship-d6458e2b-a39f-4c02-9f97-a841eed5fd86) | Detailed orange-cockpit design, but listing reports 540,900 polygons and procedural/no texture UV workflow; creator requests credit and commercial contact. Defer. |
| [Realistic Earth · archmark25](https://www.cgtrader.com/free-3d-models/space/planet/realistic-earth-e9d54965-b66f-4171-ac69-8b8734e7e7f3) | Strong continents/night lights; advertised 21K maps and Cycles atmosphere are outside browser budget. Possible later texture reference after terms/size review. |
| [SpaceSuit · cgscalrod](https://www.cgtrader.com/free-3d-models/character/sci-fi-character/spacesuit-astronaut-sci-fi-ready-for-game) | More believable surface suit; 2K maps, listed game-ready. Rig/animation compatibility must be verified before acquisition. Existing licensed Ely remains. |
| [Spaceship Corridor Damaged · ArmTM](https://www.cgtrader.com/free-3d-models/space/spaceship/spaceship-corridor-damaged) | Rich cables/panels, but 344,393 polygons, procedural maps, no UVs/nonmanifold geometry; heavy baking/cleanup required. Defer. |
| [Futuristic Transport Shuttle · 3DHaupt](https://www.cgtrader.com/free-3d-models/vehicle/sci-fi-vehicle/futuristic-transport-shuttle) | Distinct glass-canopy silhouette and ~16K polygons, but Editorial License (no AI); do not assume commercial-game permission. Defer. |

Other catalog previews included NASA Moon, cinematic Earth, astronaut suits, clouds, several original fighters, and recognizable franchise ships. Prefer original Royalty Free assets whose actual game distribution terms and budgets are verified. CGTrader is the user's requested primary source for future authored props/environments; maintain source/creator/terms evidence per imported asset, and use MixamoHarvester for licensed motion/character acquisition when fresh credentials are available. “Free” alone is not a geometry, texture or license guarantee.

## 2026-10-14 · Free props and retained-session request

Kept the CGTrader catalog filter `free=1`; subscription promotions are not treated as free assets. In addition to the earlier six detailed comparisons, reviewed free crate/canister searches and detailed listings for [CC0 Crate 6](https://www.cgtrader.com/free-3d-models/household/household-tools/cc0-crate-6), [CC0 Keypad Door Lock](https://www.cgtrader.com/free-3d-models/electronics/computer/cc0-keypad-door-lock) and [Game-Ready Sci-Fi Crate](https://www.cgtrader.com/free-3d-models/exterior/sci-fi-exterior/game-ready-sci-fi-crate-ac506376-5154-419c-b631-529673134de2). The previously previewed 19-prop sci-fi pack remains a visually cohesive candidate. Listing CC0 descriptions and platform Royalty Free/No AI badges need reconciliation before redistribution. CGTrader royalty-free game incorporation terms require commercially reasonable protection against asset extraction; a free listing alone does not authorize stock-model redistribution in this public repository. No pack or new model was downloaded/imported in this iteration.

The new coolant cabinet/cache use two generated cuboids and two status-strip cuboids (48 triangles total), existing metal material, two basic status materials, no maps, loaders or external downloads. The conservative collision boxes match the main cabinet/crate bounds. Stock/claimed status changes the strips from cyan to gray. These are gameplay fixtures, not authored or realistic equipment.

User-requested cookie retention is now permitted only in ignored private local browser state. An initial isolated-browser sign-in succeeded, but copying that profile did not retain its incognito session. The browser was corrected to a true Playwright persistent context; it is awaiting a fresh verification code. Authentication persistence is not yet verified. Do not report that cookies were successfully saved until a restart restores the authenticated session. CGTrader can still expire sessions independently. No cookie values or verification codes belong in Git or browser bundles.

## 2026-10-14 · Authored-model download recovery

The craft/station loader no longer permanently caches a failed promise. It deduplicates concurrent downloads, evicts only the failed asset, preserves fallback visibility until loading succeeds and installs one shared-resource clone per actor. Requests occur on explicit launch/boarding, never on each render frame. Successful sources remain cached for later trips. This changes reliability, not geometry, textures or visual realism; existing asset budgets/license provenance are unchanged.

Rechecked CGTrader with the real Free filter (`/3d-models/space?free=1`), restored the private persistent profile and confirmed it remains signed out. A new code was requested from the site and the user; authentication and restart-confirmed retention remain pending. Reinspected the selected sci-fi pack preview; current listing still advertises 19 textured props / 96.3 MB Blender source and Royalty Free (no AI). Creator public listings for the reviewed CC0 crate/keypad corroborate their descriptions but still require an acquisition flow. No CGTrader asset was downloaded, no alternate account was created, and no credentials/session files are tracked or packaged. The preferred next import remains a bounded selection from the free sci-fi pack after authentication and distribution checks.

## 2026-10-14 · Kestrel engine feedback

Reopened the actual free-filtered CGTrader catalog and preferred sci-fi pack listing. The private profile is still signed out, and fresh verification remains unanswered; no new code email was sent this cycle and no model was downloaded/imported. The free pack remains the next planned authored prop acquisition after authentication and distribution checks. No account/session data is in the source or deployment.

Flight feedback uses the existing supplied craft plus a shared 12-triangle open cone geometry. Each of two effects roots holds two cones and one shader material; only the active third-person flight view renders its pair (24 added triangles, two draw calls). No texture, light, shadow caster, particle allocation or external download is added. Additive depth-tested emission tapers blue/white with a bounded pulse; engine positions and downward lift orientation are approximate authored offsets for the supplied model and fallback, not animated source nozzles. Side banking changes the model pose but not collision bounds. Existing model/texture budgets and licenses are unchanged; no hardware FPS or physical exhaust claim is made.

## 2026-10-14 · Nysa field map

The map uses local Canvas 2D and the existing deterministic terrain-height function, no external images/maps/models/fonts. A 256×256 cached relief canvas is generated on first opening; another 256×256 display canvas draws the grid, five named destinations, discovery colors and optional player/waypoint markers. Their pixel buffers total about 0.5 MiB before browser/driver overhead; temporary first-generation ImageData is not retained. This does not allocate a Three.js texture or change mesh/light budgets. It depicts sampled relief, not exact triangulated collision heights or safe paths.

CGTrader was reopened with `free=1`. Retained authentication still reports signed out, and no new verification email was sent while the previous request is unanswered. No new CGTrader model was acquired or imported. Existing supplied/crew assets and license budgets are unchanged; the reviewed free sci-fi pack remains the next planned authored prop source after verification and distribution checks. No cookies/credentials are committed or packaged.

## 2026-10-14 · Second Nysa pad

The new Arch pad reuses the generated pad material/glow and shared geometry for both landing circles: one extra 128-triangle cylinder and 576-triangle torus instance (704 additional triangles, up to two extra draw calls). No additional lights/maps/models/downloads or craft clone are added. The existing craft, beacon and physical hull/boarding collider move to the selected location. Terrain mesh density remains 96×96; both centers are flattened with smooth relief blending, vegetation avoids both and deterministic rocks preserve clear pad/goal corridors. Rock placement/count can change as the exclusion plan expands. No measured hardware FPS gain is claimed.

CGTrader retained the actual `free=1` catalog filter. Private profile remains signed out; no new code email or model import. The connected mail profile did not match the CGTrader account, so no inbox or verification message was read. Fresh user verification and distribution checks are still needed for the reviewed free sci-fi pack. No credentials, cookie values, codes or email contents are committed or deployed.


## 2026-10-14 · CGTrader session restored and bounded acquisition

Fresh user verification completed. The first immediate check was too early; a subsequent valid listing showed authenticated account controls. Separate full browser restarts restored authenticated CGTrader catalog/listing access with `free=1`, and normal Free Download access succeeded. CGTrader cookies/local storage are exported only under ignored `.local/` with directory 700/file 600; session cookies are explicitly restored. The profile/export are never tracked or packaged. Provider sessions can still expire or disappear with a replaced workspace.

After the existing multi-candidate visual review, downloaded only `storage_box.glb` (3,263,088 bytes, 564 indexed triangles, one mesh/material and three embedded images; SHA-256 `3d8682e3d4292b38eae663c2398b51564f3922647cdf4fdce10b77f2da0052db`) and `bottle.glb` from [Sci-fi asset pack](https://www.cgtrader.com/free-3d-models/space/other/scifi-asset-pack), model 4044829, creator **desanlisadrien1**. Actual listing license: **Royalty Free License (no AI)**. Files were acquired through authenticated normal download buttons, without buying paid or subscription models. Raw sources remain ignored at `.local/cg-props/`; neither model is yet integrated or published.

Next: inspect individual rendered geometry/materials, resize textures and fit selected props to the existing coolant interactions/collision bounds. Complete the game's extraction-deterrence packaging required by the reviewed royalty-free terms before distributing any derivative; do not publish stock GLBs as standalone assets in this public repository. Existing game model budgets remain unchanged.


## 2026-10-14 · User-selected vehicle and interior derivatives

All eight files were acquired through normal authenticated CGTrader download controls. The saved private session restored without another verification code, and the actual Free catalog filter remained selected. Raw Blend/GLB/RAR/ZIP files, map derivatives and cookies remain ignored and are excluded from deployment. Listing terms are Royalty Free (no AI); Intrepid additionally states public domain. The Cyber Biker pack has user-confirmed creator redistribution permission, independently unverified.

| Asset | Creator | Triangles | Primitive draws | Packed transfer |
| --- | --- | ---: | ---: | ---: |
| biker | HRNLSTUDIO | 28,609 | 31 | 1,896,160 B |
| bike | HRNLSTUDIO | 23,264 | 26 | 1,446,680 B |
| rover | dragosh21 | 27,928 | 6 | 1,034,838 B |
| corridor | dibacgi | 37,143 | 2 | 482,100 B |
| bedroom | MASSX-RZ | 53,832 | 14 | 1,414,757 B |
| interior | MiskatonicStudio / Zaven Boyrazian | 66,290 | 14 | 1,585,462 B |
| cockpit | ViitorX | 48,000 | 4 | 4,799,821 B |
| ship | OK3D | 59,123 | 18 | 2,574,535 B |

Exact listing IDs/URLs, hashes and bounds/budgets are in `public/assets/requested/provenance.json` and the converter scripts. Vite fingerprints each EBU1 derivative. The payload is gzip-compressed and authenticated/encrypted with a public format key. It deters direct standalone stock-model distribution; it is not secret DRM or an unextractable asset guarantee. The client needs its public decoder. No credentials are present in the resources.

Biker: 67 joints; prior licensed Mixamo Idle/Walking were retargeted, while Running/Riding are locally authored. The same captured MixamoHarvester-acquired motion is reused; no fresh Mixamo login or run download occurred. Clothing/accessories were selected, unused anatomical/source reference meshes excluded. No hand/foot IK, facial capture or new photorealistic character claim.

Bike: static optimized chassis, wheels remain fixed. Rover: four normalized local-X wheel pivots spin by actual travel; gray PBR preserves silhouette with roughness/partial emission. Original procedural color/decal/cyan/normal-bump detail is omitted. Conservative Rapier proxies match body envelopes; the rover antenna tip is decorative beyond its two-meter collision height. Parking is cleared of rocks and footprint ground rays prevent starting inside slopes. There is no physical suspension, wheel friction or rigid-body tire model.

Ship: roughly two million source triangles reduced to 59,123, with one rigid mesh/18 draws and 48 embedded maps, mostly512 and at most1024. Nose−Z and floor normalization fit the conservative craft clearance; weapons/engines/gear are static authored geometry with game-added exhaust feedback. Cockpit: 48,000 triangles/four draws/six1024 maps; pilot eye at origin, glazing removed, emission reduced, clear forward view. Displays are decorative.

Station: only the visible Intrepid assembly is retained at uniform1.5 scale. Structural floors/walls are not decimated; closed original side panels were replaced by the game bulkheads, threshold floor bridges added, and the aft center opened for the runway. Actual exported triangles drive static collision. Thirty-nine embedded512 maps preserve available DDS PBR data; PNG-only source emission/decals are unavailable in the DDS archive and are simplified. Off-scene asset libraries and a malformed below-floor locker are excluded.

Corridor: source FBX lacks Cinema4D shaders/maps. Structure is adapted to10×6×24m with reconstructed material colors and12 game-specific cyan strips, open endpoints and conservative walkway proxies. Its orbital clone has increased vertical scale for bay clearance. Bedroom: dense non-destructive construction exhausted available memory; bounded base geometry, Mirror/Solidify and static decimation retain the sleeping pod, desk and panels. The actual monitor image/grunge roughness are included; other procedural materials are reduced to14 PBR families. Shoes, bonsai and DAZ character/background are excluded. A2.2m entry joins the runway; exact triangles provide room collision.

Terrain remains locally generated: four relief regions with smooth color transitions, shallow clipped water and reeds, shared render/Rapier geometry and retained mission landmarks. The192×192 cells submit73,728 ground triangles over256×256m. This is one sector rather than whole-planet streaming or additional worlds.

The new station has five authored game point-light sources; performance mode keeps the four-slot selection policy. Models/terrain add rendering and decoded texture costs despite their reduced source budgets. Software browser checks cannot establish hardware/mobile FPS, GPU memory or television-level realism. Future work should prioritize measured device budgets, LOD, animation contacts and more faithful source-material baking.

Embedded JPEG/PNG headers are checked by tests, rather than trusting Blender image dimensions. The bedroom initially retained original4K packed bytes despite scaled preview buffers; fresh image datablocks and a byte-preserving GLB repair now enforce1024 caps. Non-image geometry buffer hashes are unchanged by that repair.

## Character and environment repair (2026-10-14)

Cyber Biker shader groups previously exported white emission, and the source hair material lacked robust cutout rendering. The converter now reconstructs lit PBR from the original albedo/normal/roughness images, disables body emission, and emits two-sided MASK hair at cutoff0.35. Face/hair maps reach1024; remaining maps are bounded. World-axis bone-direction retargeting corrects A-pose/T-pose arm mismatch. The bike is uniformly normalized to2.5 m with its collider/seat reduced accordingly. The Intrepid derivative is adapted to a7 m lounge, with floor trim removed and a bow aperture; render and authored collision still share geometry.

New resident: [Cute Girl by seemlyhasan](https://www.cgtrader.com/free-3d-models/character/woman/cute-girl-5122a81c-b888-4276-affd-71031a1ddb5a), model2712319, CGTrader Royalty Free License (no AI), listing verified through the creator's catalog. Downloaded girl.rar SHA25650ee46b8c1a5c396cb625c02ce097b1c4b1943061a1e81af33194b4ffcc9c742 remains private. The original lying pose and geometry are retained; source pedestal is removed, standard lit materials/local textures supplied, rigid normalization/bed placement only. In-room instance scale is 1.12 (~1.85 m length), per the user’s follow-up, without changing the pose. No rig, animation or original bedroom-preview character equivalence is claimed. Public fingerprint/budget metadata includes the resident.

Generated window panorama: OpenAI image generation, 2048-pixel-wide local WebP (~235 kB before final bounded resize), depicting a planet, star field and nebula. Only one scenic plane behind the bedroom rear window uses this image, with transparent glazing. It is hidden during planetary/orbital travel and is not a simulated additional world. The bow and other windows retain native 3D space. Seven station point-light sources share four performance slots; the prior five-source count is superseded.

## Deep Scan passage and jump motion (2026-10-15)

The same Intrepid source derivative now widens the forward Science/Navigation area to7.35 m, independently of the previously widened aft lounge. Original source door surfaces inside the forward passage are opened; both side gaps around real console proxies are traversable. Updated interior budget:87,772 triangles,2,026,317 B encoded. Character Jump adds a locally authored in-place0.8 s clip, leaving the compatible67-joint rig/materials and prior captured Idle/Walking. Updated biker transfer1,924,042 B. Run remains locally authored. MixamoHarvester was attempted for exact Running/Jump catalog entries using the retained private credential: catalog/product queries returned200, export returned401 “Oauth token is not valid”; no new captured clip was downloaded. No token or signed URL enters logs/Git/dist.

## 2026-10-15 · Rover material fidelity

Reprocessed the already acquired, user-selected Sci-fi Rover by dragosh21 (model4463132, original private Blend SHA256 unchanged). Compared the original source render, previous gray derivative and candidate material renders. No new model/login/download is needed for this improvement. Original albedo now retains green antenna panels and dark rubber, with baked tangent normals, roughness and supported emission in four1024 atlases. Object/Generated coordinates are recorded per source part before consolidation; final-topology UV/tangent baking avoids a decimation mismatch. Metallic remains an approximation (.58 hull,0 rubber,.05 glass), normal strength.65 and emission.7. Roughness is clamped.42–.95: isolated renders showed near-zero roughness causing unacceptable patchy mirror highlights. Earlier unclamped candidates were rejected, not shipped.

Source animation audit found no armature and no usable motion clips, only four single-frame shader actions. Runtime tire-node rotation remains driven by traveled distance; no captured suspension/steering animation is claimed. Model remains27,928 triangles/six primitive draws,3.6 m long and≤2.1 m wide, floor0. Encoded derivative875,610 B (previous1,034,838 B, ~15.4% smaller). Four images instead of two add approximately8 MiB decoded RGBA storage before mipmaps/driver overhead despite the smaller transfer. Source attribute-dependent overlays/procedural wear and metallic response are approximated; this is not exact Blender-shader preservation. Hardware memory/FPS remains unmeasured. Only the rover resource/provenance changed; other eight derivative hashes were verified unchanged before recording metadata.


## 2026-10-15 · Terrain-following presentation

Reused the already selected CGTrader Cyber Biker/Turbo Bike and dragosh21 rover without new downloads, resource conversion, texture changes or account login. Existing captured Idle/Walking and local Riding/Run/Jump remain. The rover source previously audited has no usable motion clip; its actual-distance wheel rotation remains. Four support samples per vehicle use the existing height-field vertex array (no new height mesh, raycast, texture, light or model). Per-frame math adds smoothed pitch/roll and a bounded visual height adjustment; the bike rider uses the same seat transform. Geometry/transfer/image counts and resource hashes remain unchanged. This does not add physical suspension, tire friction, individual wheel travel, hand/foot IK or exact obstacle contact. Mobile hardware FPS remains unmeasured.
