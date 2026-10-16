# Silent Network expedition

Nysa has an optional three-stop expedition independent of the original sample, two scans and coolant cache. It adds destinations across the existing256×256m sector; the planet is not globally streamed.

After genesis, land on either existing pad and open **INFO → FIELD LOG**, or press **J**. Choose **Track next expedition objective** under **SILENT NETWORK**. Use the bike or rover for the longer trips, brake and dismount to operate a receiver.

1. **Dune relay**, local X−76 / Z64: face its amber receiver console and press **E** to clear the receiver and reseat its coupler.
2. **Basalt relay**, X−83 / Z−78: repair the second console. Either order works. Tracking automatically advances to the remaining receiver.
3. **Communications outpost**, X76 / Z−80: walk through the open south entrance and use **Activate outpost uplink**. Both receivers are required. A premature attempt names the missing carrier; nothing is consumed or completed.

Activating the uplink turns the console/entrance/pad indicators green, starts the tracking antenna and unlocks **Relay pad**, X76 / Z−55. Revisit the console for Archive03's story fragment about the forge's anticipatory17.4Hz signal. **Survey debrief** with either officer reports receiver progress or the restored network.

Board Kestrel and fly toward Nysa again. **PAD / L** now cycles **Survey → Arch → Relay**. Select before capture; the guided descent, parked shuttle/hatch, local vehicles, return boarding and extraction guidance all use the selected pad. The locked Relay pad is visible amber on the ground but unavailable in the flight selector. The mission never requires this expedition to sample, scan or return aboard. **Restore mission guidance** cancels expedition tracking.

Repairs and uplink activation save under additive `network` fields in the existing v2 device-local save. Old saves default to an offline network. Unknown/duplicate/malformed repairs are filtered; online requires both valid receivers and completed genesis. Reset clears them. Reload starts safely aboard, retaining the unlock; older versions can read the original mission fields but may discard the added expedition fields on their next save. Landing location and tracking remain transient.

The outpost reuses two straight modules from alitoons' reviewed free CGTrader kit, its existing palette textures and two copies of the reviewed PBR cargo crate. Outer cladding, masts, dish, controls and status screens are simple game-built geometry; the source kits are not photoreal artwork. The open front has no airlock or pressure simulation. Exact imported trim/deck triangles provide collision; matching boxes block outer walls/back and equipment. Four-centimeter separation keeps the authored floor above the prepared terrain. A failed import retains a playable shell and retries on surface re-entry. Source geometry/maps are shared and preserved; no login, raw stock file or new resource download is introduced.

One short-range interior point light has no shadows and is enabled only near the outpost (24m entry/28m exit hysteresis). It adds direct-light work while nearby. The antenna's simple game-authored yaw freezes during pause/dialogue or while away from the visible surface; no captured dish/repair animation or NPC task simulation is claimed. Real hardware GPU budgets and seamless additional worlds remain future work.

`tests/relay-expedition.test.ts` checks compatible saves, progression in both orders, prerequisites, tracking, pad selection/flight offsets, terrain/rock clearance, actual packaged-kit Rapier entrance/deck/side/back collision, receiver reach/sight, deck height and failed-import retry/pause behavior. `scripts/relay-expedition-qa.mjs` checks the interactions, field log, new guided landing and reload with real input, using fixtures to skip unchanged interplanetary travel and place the player near distant sites. `scripts/relay-visual-qa.mjs` captures source-textured room/receiver views; `--floor-only` verifies the changed deck through actual walking. These are Chromium/SwiftShader checks, not physical mobile-device or hosted-render measurements.
