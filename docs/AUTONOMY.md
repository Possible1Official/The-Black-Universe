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
GitHub is authoritative. The workspace may not survive between scheduled runs. Never depend on a local bearer token remaining available. Read the latest asset status before fetching; do not harvest every Mixamo asset. Record source, license/terms and optimization statistics for imported assets. The current credential screenshot is not a reliable reusable authentication source.
