# LLM IQ Index

One IQ-style number for each of the 10 strongest closed and 10 strongest open-weight language models, for every thinking mode they offer.

**Live site:** https://solarity-ai.github.io/llm-iq-index/

## How scores are made

- Each mode's [Artificial Analysis](https://artificialanalysis.ai/) Intelligence Index converts to IQ with `IQ = 100 + 0.6 × index`.
- Where [TrackingAI](https://www.trackingai.org/home) tested that exact model and mode on its offline IQ test, the score is the average of the two.
- Release months come from Artificial Analysis. Parameter counts are the labs' own figures for open-weight models and marked estimates for closed ones.

## How it stays current

The `Site` workflow (`.github/workflows/site.yml`) runs every 3 hours, on every push to `main`, and on demand:

1. `npm run update` pulls every model and mode from the Artificial Analysis free Data API and merges it into `data/models.json`. New models are classified open or closed by the rules in `scripts/update-from-aa.mjs`; any it can't classify are held back and listed in a GitHub issue.
2. `npm run build` regenerates `data.js` (the top 10 of each kind) and stamps cache-busting versions on the page's assets.
3. `npm test` must pass; changes are committed and the site is deployed to GitHub Pages.

The refresh needs a free Artificial Analysis API key stored as the repository secret `AA_API_KEY` (Settings → Secrets and variables → Actions). Without it the workflow still tests and deploys, but scores stay as last committed.

Curated by hand in `data/models.json`: parameter counts for new models, TrackingAI results, and the display names that group a model's modes (`aaNames`).

## Develop

Requires Node 22 or later (see `.nvmrc`); no dependencies to install.

| Command | What it does |
| --- | --- |
| `npm start` | Serves the site at http://localhost:8080 (set `PORT` to change it) |
| `npm test` | Runs the test suite |
| `npm run build` | Regenerates `data.js` from `data/models.json` and stamps asset versions |
| `npm run check` | What CI runs: build, tests, and a check that generated files are committed |
| `npm run update` | Refreshes scores from Artificial Analysis (needs `AA_API_KEY`) |

After editing `data/models.json`, run `npm run build` and commit the regenerated files.

Data: Artificial Analysis (attribution required by their API terms) and TrackingAI.
