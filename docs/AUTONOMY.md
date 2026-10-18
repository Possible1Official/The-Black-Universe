# Autonomous development

The user authorized hourly development, testing, committing, and automatic merging. A built-in recurring task titled **Develop The Black Universe** was created and confirmed enabled on 2026-10-13. Its schedule starts 2026-10-13 01:58:11 UTC and repeats every hour without a count limit. One recurring task covers all future cycles; additional overlapping schedules are unnecessary. Actual task execution is subject to service availability, quotas, permissions, and runtime tools.

## Per-cycle protocol
1. Successfully read GitHub. Clone/update a clean checkout. Read project instructions, roadmap and progress; check open development PRs and recent commits. Skip a cycle if another is actively editing the same scope; never overwrite concurrent work.
2. Establish a baseline with tests/build and inspect the current playable version. Prefer observed defects over new features.
3. Create `cycle/<timestamp>-<scope>` from latest main. Create a rollback tag or record the starting commit in the log.
4. Implement a bounded, reviewable improvement. Keep gameplay functional, credentials private, and save data compatible. Do not add unused frameworks.
5. Run `npm test` and `npm run build`. Perform browser QA when available; record exactly what passed and what could not be checked.
6. Update ROADMAP and PROGRESS. Commit, push, create a PR. Wait for CI, then merge with an expected head SHA or equivalent guard. Never bypass failed checks or branch protection.
7. GitHub Actions deploys the passing main build's `dist/` artifact to GitHub Pages. Pages source must be **GitHub Actions**, not the repository root. Check the deploy-pages job and actual project URL before claiming publication. Actions is **not a development scheduler**; retain the built-in hourly task. The existing owner-private Site remains separate: when publication there is requested, mirror the exact tested main SHA with a fresh stdin-only credential, package `dist/` and `.openai/hosting.json` outside the checkout, and use native private save/deploy while preserving audience. Do not replace the hosting manifest or private project with Pages metadata. Report errors honestly; retain the previous playable release if validation fails.

## Rollback
Use `git revert <merge-commit> -m 1` for a merge commit, or revert the squash commit. Run tests/build and merge the revert through the same process. `foundation-baseline` preserves the initial repository state. Avoid resets/force pushes. Local saved mission data can be reset in the game settings.

## Durable state
Current user priority: expand piloted shuttle flight, landing and planetary exploration toward Infinity-like immersion. Read FLIGHT.md and the reprioritized ROADMAP before selecting the next cycle. Keep the full launch/land/survey/board/dock loop playable while improving realism and NPC/ship agency.

GitHub is authoritative. The workspace may not survive between scheduled runs. Never depend on a local bearer token remaining available. Read the latest asset status before fetching; do not harvest every Mixamo asset. Record source, license/terms and optimization statistics for imported assets. The current credential screenshot is not a reliable reusable authentication source.

The 2026-10-14 user request adds INFO/H clear view, first/third-person walking and flight, and supplied craft/station assets. Preserve these controls/preferences and read VIEWS.md before changing HUD/cameras. CGTrader is now the preferred source for future authored models: explore multiple visual candidates and actual licenses/budgets before a bounded import. ASSETS.md records the previewed shortlist and supplied-model limits. The user now explicitly requests retaining the CGTrader sign-in. Use a private persistent browser profile under ignored `.local/cgtrader-profile/`, directory mode 700, and any Playwright storage-state export with mode 600. Verify the authenticated session survives a browser restart before claiming success. Never print cookie values, track these files, or include them in deployment archives. Sessions can still expire and the workspace may be replaced; reuse available state before requesting verification. Prior verification codes are not reusable. Mixamo credentials remain separate.

While asset-site verification is unanswered, avoid sending another code email in each hourly cycle. Recheck retained authentication, keep the requested Free filter and continue independent game work. Report model acquisition as blocked; obtain a current code when the user is available rather than reusing an old one.


Session restoration now uses `scripts/browser-session.mjs`: export only CGTrader cookies and local-storage origins atomically into an ignored private directory (700), file mode 600; import before visiting CGTrader, including session cookies with expiry -1. Save only after authenticated account controls are confirmed, and recheck after a complete browser restart. Chromium profile persistence alone is insufficient for session-only cookies. The helper is Node-only and never enters the game bundle. `scripts/browser-session-qa.mjs` verifies a locally fulfilled fixture across two separate Chromium launches, without using real account credentials or contacting the site.


Asset expansion `feature/20261014-nysa-vehicles` integrates the eight selected CGTrader derivatives, Intrepid layout, Nysa terrain, vehicles, independent view/steering and animation. Check whether its PR remains open before starting another cycle; do not overlap unmerged work. Rollback starts at b650070a76d154e8934de321ae4ed11ec68c1eaa with pushed tag `rollback-20261014-nysa-vehicles`. Account retention restored successfully without a new code; only ignored private state may retain it. Raw stock sources never enter Git/deployment.
