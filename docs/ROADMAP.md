# Roadmap

Vision: an immersive, physically coherent browser universe with explorable vessels and worlds, believable characters, and increasingly capable NPCs. This is a long-term program, not a promise of television-level realism from one build.

## Foundation (current cycle)
- Starship bridge, concourse, engineering and observatory; animated colossal universe forge.
- First-person controls, touch controls, Rapier collision, functioning bulkheads.
- Restore three relays, initialize genesis, scan resulting planet; device-local save.
- Temporary articulated android crew with state-aware scripted dialogue.
- Tests, private Sites publication, rollback reference, hourly development task.

## Next four prioritized cycles
1. **Character pipeline:** obtain valid Mixamo access, import one approved character with idle/walk clips, optimize to GLB, add asset provenance and budgets. If access is blocked, improve lighting/materials and crew collision/animation instead.
2. **Ship simulation:** power distribution and containment diagnostics with observable consequences, ambient machinery, better doors, minimap and navigation aids. Preserve completed saves through a versioned migration.
3. **First planetary excursion:** a small Nysa surface with terrain collision, landing/extraction loop, atmosphere, biome detail and a meaningful exploration objective.
4. **NPC agency:** navigation graph, schedules, perception and task execution, with explicit goals and failure recovery. Add deterministic simulation tests. Dialogue can remain local until a properly authenticated backend exists.

## Later
- Physically based and baked lighting, modular authored environments, LODs, GPU timing and measured device budgets.
- High-quality skinned characters, blend trees, IK, facial animation, interaction poses.
- Ship travel and docking, procedural planets with bounded streaming, persistent world state.
- Locally grounded agent memory/planning with validated action tools; optional server AI with cost caps.
- Multiplayer only after a stable authoritative simulation and abuse-resistant persistence exist.

Completion and evidence live in PROGRESS.md. Priorities may change based on observed bugs and performance.
