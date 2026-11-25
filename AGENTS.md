# Rules for AI agents

Verify: `npm run check` (build, `node --test`, and a check that the generated `data.js` and `index.html` are committed;
CI runs it on every pull request).

LLM IQ Index: a static site with 1 IQ-style number for the 10 strongest closed and 10 strongest open-weight language
models, per thinking mode. Live at https://solarity-ai.github.io/llm-iq-index/.

## Commands

- `npm run check`: the verify command above. Node 22 or later (`.nvmrc`); no dependencies to install.
- `npm test`: the tests alone (`node --test tests/*.test.mjs`, offline). 1 file: `node --test tests/scoring.test.mjs`.
- `npm run build`: regenerates `data.js` from `data/models.json` and stamps asset versions in `index.html`.
- `npm start`: serves the site at http://localhost:8080 (`PORT` to change it).

## Layout and data flow

`data/models.json` (curated + refreshed data) → `scripts/pick.mjs` (top 10 of each kind) → `scripts/build.mjs` →
`data.js` (GENERATED) → `app.js` renders it in `index.html`. `scripts/update-from-aa.mjs` merges Artificial Analysis
scores into `data/models.json`; models it cannot classify are held back as `pending`.

## Rules

- Never hand-edit `data.js` or the version stamps in `index.html`: edit `data/models.json` or the scripts, then run
  `npm run build` and commit the regenerated files.
- Do not run `npm run update` and never read or print `AA_API_KEY`: the refresh runs only in the `Site` workflow.
- The `Site` workflow (refresh, land the data on `main` through a pull request it opens and merges, deploy to GitHub
  Pages) runs only on demand; do not dispatch it.
- Artificial Analysis attribution stays on the page (their API terms).

## Shipping

- 1 issue per piece of work, then a branch `feat/<issue>-<slug>` or `fix/<issue>-<slug>`.
- Commit subjects `feat: … (#<issue>)` or `fix: … (#<issue>)`; the pull request body says `Fixes #<issue>`.
- Squash merge once CI is green.
