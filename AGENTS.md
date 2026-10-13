# The Black Universe

Build this existing repository incrementally. Never use Vercel or Supabase.
Read README.md, docs/ROADMAP.md, docs/PROGRESS.md, and docs/AUTONOMY.md before work.
The core game must run locally without accounts, API keys, or remote assets.
Keep bearer tokens and asset-import credentials outside Git and browser bundles.
Use TypeScript, Three.js, and Rapier; preserve this stack unless a measured need warrants change.
Document implemented behavior separately from future goals. Do not describe scripted crew as LLM agents or placeholder meshes as realistic people.
For each cycle: pick a coherent improvement, validate with meaningful tests plus `npm run build`, update progress, create a branch and PR, and merge after checks pass. Preserve history and a rollback reference. Respect branch protection and concurrent edits. GitHub Actions handles CI only; native Sites serves the exact mirrored build; development is initiated by the built-in hourly scheduled task.
