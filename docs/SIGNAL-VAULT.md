# Signal Vault / Archive 04

The Signal Vault is a new walk-in research site at Nysa local X66 / Z76, on the far side of the wetlands. It extends Silent Network with an optional receiver-tuning puzzle and an interior archive. It is within the existing256m sector, not a second planet or an enlarged streamed world.

1. Repair both Silent Network receivers and activate the communications outpost. Its Archive03 now gives the vault carrier:17.4 Hz, antenna bearing120°.
2. Open J / FIELD LOG → Track Signal Vault. Drive or walk there; leave vehicles outside the sealed entrance. The exterior receiver is to the right of the door.
3. Approach **Tune vault receiver** and press E. Adjust frequency and antenna bearing; the signal percentage responds to both. Wrong settings leave the door closed. Keyboard users can focus the sliders and use arrow keys; touch users can drag them.
4. At17.4 Hz /120°, select **Lock carrier / open vault**. The panel closes and the imported sliding door opens. Pause or dialogue freezes it; resume to finish opening.
5. Walk through the door and three joined source-kit cells. Approach the recorder at the far end and press E to recover Archive04. The field log retains the text; the officers' survey debrief reports it. Tracking now leads inside.

Recovery and calibration save locally alongside existing readings/sample/ECHO progress. Reload safely starts aboard; the vault remains open on return. Its archive can be revisited without another reward. Reset clears the new flags and closes the door after returning aboard. Neither the original sample nor existing readings requires this expedition; you can return to Kestrel at any time. ECHO is optional and follows only where its existing swept-volume path fits.

## Appearance, physics and limits

Reuse alitoons' reviewed free CGTrader corridor starter kit and desanlisadrien1's source-textured cargo/canister derivatives. The three straight cells, door frame and moving leaves preserve original geometry, palette/materials and maps. Two crates and the recorder reuse existing PBR props. The kit's actual Door_Open clip supplies leaf motion; this is not a replacement hand-made door animation. No new model download, source conversion, packaged resource or image bytes are introduced. Supplemental outer cladding, mast/dish, labeled sign/receiver and local interior/porch lighting are simple authored geometry. These remain stylized assets, not photorealistic interiors.

Prepare one modest terrain footprint, shared by rendering and physics, and keep existing rock scatter out of the building and approach. Authored floor stays4cm above the prepared terrain, avoiding overlapping floor surfaces. Real imported mesh collision covers trim/deck; visible shell boxes close side/back/front shoulders and roof. Each source door leaf has its own moving collider. Refresh the full parent transform before initializing door collision; a new-world-space test caught the ordering defect. The thin center seam can transmit a sight ray, but admits no walking capsule; the archive is distant and explicitly requires calibration. Side/back walls reject through-wall interaction.

Door movement uses the existing fixed-step clock rather than a frame-count timer. It opens only; no automatic closure can crush a visitor. Reload restores the saved open pose. On import failure, a solid shell/floor/sliding-door fallback remains playable, with explicit surface-entry retry. Successful source geometry/maps are shared, with no duplicated download or repeated model attachment.

Six new tests cover tuning feedback and gates, compatible/hostile saves, optional tracking/debriefs, terrain/rock clearances, actual shipped geometry with real Rapier walking/door/side/back/floor rays, and bounded import retry/resource sharing. Browser evidence is in PROGRESS. No general signal simulation, NPC encounter, aerodynamic door physics, new flight destination or physical-device performance claim.
