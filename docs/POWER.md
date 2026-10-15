# Power routing and containment

Engineering has an interactive **CONTAINMENT / POWER ROUTING** console beside the rear power relay. Three profiles change forge output, reactor thermal load and habitat lighting:

| Profile | Forge bus at 3 relays | Habitat light level | Thermal target at 3 relays | Time constant |
| --- | --- | --- | --- | --- |
| Balanced | 55% | 100% | 38% | 15 simulation seconds |
| Genesis | 100% | 55% | 112% (overload target) | 15 simulation seconds |
| Cooling | 10% | 80% | 18% | 6 simulation seconds |

These are normalized gameplay ratings, not watts or Celsius. Habitat lighting is relative to its baseline; its percentage is not an allocation to add to forge output. This is a deliberately small fictional model, not an energy-conserving reactor engineering simulation.

Available forge capacity scales linearly with the number of restored relays: `capacity = 100 * relays / 3`. Actual forge bus output is capacity times the profile coefficient. Thermal load follows exponential relaxation: `heatNext = target + (heat - target) * exp(-dt / tau)`, with the target interpolated between standby load (18) and the profile target by relay count. Heat is bounded to 0–100. Power simulation uses fixed 60 Hz steps accumulated from wall time, capped at 0.25 seconds per rendered frame to bound catch-up work. Movement keeps its existing 0.05-second frame cap. Very low rendering rates can still slow simulation; no hardware performance claim is made.

At 75% heat a warning appears; at 95% containment trips and latches. The forge bus is isolated and habitat lights use 40% emergency output. A tripped reactor cools toward 18% (6 seconds time constant in Cooling, 12 otherwise). Cool to 40% or less, then press **Reset containment**. Reset restores Balanced routing. Created worlds and restored relays survive trips.

Genesis requires three relays, an untripped reactor, heat below 80%, and forge bus output of at least 40%. Balanced remains stable and supports the existing mission. Cooling prevents initialization until Balanced or Genesis is selected. Thermal state continues evolving while the engineering panel is open; opening the pause menu freezes it. Reactor emission shifts toward red as thermal load rises and stays red during a latched trip; room lighting dims with routing changes.

## Saves and rollback

Progress schema v2 includes profile, heat and the trip latch. The game reads `black-universe-v2` first, falling back to the previous `black-universe-v1` slot when no v2 slot exists. Legacy completed missions migrate with Balanced routing and fresh thermal load. Writes use only the v2 slot; the original v1 slot remains available if the application is rolled back. Progress earned after upgrading exists in v2 and will not appear in the old release. A malformed v2 power payload resets only power state while retaining valid mission progression; corrupted whole saves reset safely. Values at or above the trip threshold cannot load an untripped reactor.

Saves occur on mission/control changes, pause/dialogue close, and every 15 active simulation seconds. Offline time does not heat the reactor. Denied storage remains session-only and shows one warning. No credentials or server persistence are used.

## Validation

Power tests cover stable defaults, overload and isolation, cooling and manual reset, forge guards, preservation of generated worlds, exponential step consistency, v1 migration, and malformed power recovery. Browser QA uses a near-critical saved fixture to exercise actual threshold crossing, isolation, visible red emission, dimmed lights, cooling/reset and forge recovery, plus legacy save preservation and mobile controls. The fixture accelerates the starting condition; it does not bypass runtime power actions.

## Visible reserve stock (2026-10-15)

The open engineering rack shows two, one or zero canisters from the actual saved coolant count. Discharging removes one visual slot; Nysa cache recovery empties its visible pair and restores the rack count. The pack's static source has no animation; these are cosmetic representations of existing supplies, without individual pickup, physics or a new inventory model. Asset-loading failure retains simple canisters and the same functioning supply controls. An empty display does not download the canister asset. Reset/reload and late asynchronous imports preserve the correct visible count.
