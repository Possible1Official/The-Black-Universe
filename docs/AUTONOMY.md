# Autonomous development

The user authorized hourly development, testing, committing, and automatic merging. A built-in recurring task titled **Develop The Black Universe** was created and confirmed enabled on 2026-10-13. Its schedule starts 2026-10-13 01:58:11 UTC and repeats every hour without a count limit. One recurring task covers all future cycles; additional overlapping schedules are unnecessary. Actual task execution is subject to service availability, quotas, permissions, and runtime tools.

## Per-cycle protocol
1. Successfully read GitHub. Clone/update a clean checkout. Read project instructions, roadmap and progress; check open development PRs and recent commits. Skip a cycle if another is actively editing the same scope; never overwrite concurrent work.
2. Establish a baseline with tests/build and inspect the current playable version. Prefer observed defects over new features.
3. Create `cycle/<timestamp>-<scope>` from latest main. Create a rollback tag or record the starting commit in the log.
4. Implement a bounded, reviewable improvement. Keep gameplay functional, credentials private, and save data compatible. Do not add unused frameworks.
5. Run `npm test` and `npm run build`. Perform browser QA when available; record exactly what passed and what could not be checked.
6. Update ROADMAP and PROGRESS. Commit, push, create a PR. Wait for CI, then merge with an expected head SHA or equivalent guard. Never bypass failed checks or branch protection.
7. After merging, mirror the exact tested GitHub main SHA to the existing owner-private Site from `.openai/hosting.json`. Use installed Sites helpers when available; `scripts/sites-mirror.mjs` is a portable stdin-only fallback when they are absent. Package `dist/` and `.openai/hosting.json` into a tar.gz outside the source checkout. Save/deploy that pushed SHA using native Sites private publication, then verify returned status. GitHub Actions runs CI only; it is **not a development scheduler**. GitHub Pages setup returned HTTP 403 and is not active. Report errors honestly; retain the previous playable release if validation fails.

## Rollback
Use `git revert <merge-commit> -m 1` for a merge commit, or revert the squash commit. Run tests/build and merge the revert through the same process. `foundation-baseline` preserves the initial repository state. Avoid resets/force pushes. Local saved mission data can be reset in the game settings.

## Durable state
Current user priority: expand piloted shuttle flight, landing and planetary exploration toward Infinity-like immersion. Read FLIGHT.md and the reprioritized ROADMAP before selecting the next cycle. Keep the full launch/land/survey/board/dock loop playable while improving realism and NPC/ship agency.

GitHub is authoritative. The workspace may not survive between scheduled runs. Never depend on a local bearer token remaining available. Read the latest asset status before fetching; do not harvest every Mixamo asset. Record source, license/terms and optimization statistics for imported assets. The current credential screenshot is not a reliable reusable authentication source.

The 2026-10-14 user request adds INFO/H clear view, first/third-person walking and flight, and supplied craft/station assets. Preserve these controls/preferences and read VIEWS.md before changing HUD/cameras. CGTrader is now the preferred source for future authored models: explore multiple visual candidates and actual licenses/budgets before a bounded import. ASSETS.md records the previewed shortlist and supplied-model limits. The user now explicitly requests retaining the CGTrader sign-in. Use a private persistent browser profile under ignored `.local/cgtrader-profile/`, directory mode 700, and any Playwright storage-state export with mode 600. Verify the authenticated session survives a browser restart before claiming success. Never print cookie values, track these files, or include them in deployment archives. Sessions can still expire and the workspace may be replaced; reuse available state before requesting verification. Prior verification codes are not reusable. Mixamo credentials remain separate.
