// Refreshes data/models.json from the Artificial Analysis free Data API.
// Needs AA_API_KEY. Run: npm run update
// - updates every known model's per-mode Intelligence Index and release month
// - adds newly listed models, classified open/closed by the rules below
// - models the rules can't classify are stored with type "pending" (not shown)
//   and printed, so the workflow can open an issue for them
// Parameter counts and TrackingAI anchors are not in the free API: they stay curated.
import { readFileSync, writeFileSync } from "node:fs";

const API = "https://artificialanalysis.ai/api/v2/language/models/free";
const file = new URL("../data/models.json", import.meta.url);

// Limits for one refresh.
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const MAX_BACKOFF_MS = 60_000;
const MAX_PAGES = 50;
const MIN_MODELS = 20; // fewer than this means a broken response
const MAX_SCORE_JUMP = 15; // index points; more than half of models moving this far is suspicious

/** Splits "Claude Opus 5.5 (max)" into base "Claude Opus 5.5" and mode "max". */
export function splitName(name) {
  const m = name.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
  return m ? { base: m[1].trim(), mode: m[2].trim() } : { base: name.trim(), mode: null };
}

// Creator → default type. Name rules come first and override it.
const NAME_RULES = [
  [/^gpt-oss/i, "open"], [/^gemma/i, "open"], [/\bopen\b/i, "open"],
  [/^qwen[\d.]+\s+(max|plus)/i, "closed"], [/^mistral (medium|large)/i, null],
];
const CREATOR_TYPE = {
  anthropic: "closed", openai: "closed", google: "closed", spacexai: "closed", xai: "closed",
  meta: "closed", amazon: "closed",
  deepseek: "open", "z ai": "open", kimi: "open", moonshot: "open", xiaomi: "open",
  minimax: "open", alibaba: "open", nvidia: "open",
};
export function classify(base, creator) {
  for (const [re, type] of NAME_RULES) if (re.test(base)) return type ?? "pending";
  return CREATOR_TYPE[String(creator || "").toLowerCase()] ?? "pending";
}

/** Groups scored API rows by base model name. */
function groupByBase(apiRows) {
  const byBase = new Map();
  for (const r of apiRows) {
    const idx = r.evaluations?.artificial_analysis_intelligence_index;
    if (idx == null) continue;
    const { base, mode } = splitName(r.name);
    if (!byBase.has(base)) byBase.set(base, []);
    byBase.get(base).push({ mode, aa: Math.round(idx), slug: r.slug, date: r.release_date, creator: r.model_creator?.name });
  }
  return byBase;
}
const earliestMonth = entries => entries.map(e => e.date).filter(Boolean).sort()[0]?.slice(0, 7);
const byScore = (a, b) => b.aa - a.aa;

/** A model entry for a base name the database has not seen before. */
function newModel(base, entries, now) {
  return {
    name: base, org: entries[0].creator || "Unknown", type: classify(base, entries[0].creator), aaNames: [base],
    aaSlug: entries.find(e => e.slug)?.slug || "", released: earliestMonth(entries) || now.slice(0, 7),
    params: { total: null, active: null, disclosed: false },
    modes: entries.map(e => ({ mode: e.mode || "standard", aa: e.aa })).sort(byScore),
    trackingai: {}, addedAt: now,
  };
}

/** Merges API rows into the database. Pure: returns { db, added, pending }. */
export function merge(db, apiRows, now) {
  const byBase = groupByBase(apiRows);
  const models = db.models.map(m => ({ ...m }));
  const claimed = new Set();
  for (const m of models) {
    const entries = m.aaNames.flatMap(n => (byBase.get(n) || []).map(e => ({ ...e, prefix: n === m.aaNames[0] ? "" : n.replace(m.aaNames[0], "").trim() })));
    m.aaNames.forEach(n => claimed.add(n));
    if (!entries.length) continue; // not listed today: keep last known values
    const single = m.modes.length === 1 && entries.length === 1;
    m.modes = entries.map(e => ({ mode: single && !e.mode ? m.modes[0].mode : [e.prefix, e.mode || "standard"].filter(Boolean).join(" "), aa: e.aa }))
      .sort(byScore);
    m.released = earliestMonth(entries) || m.released;
  }
  const added = [], pending = [];
  for (const [base, entries] of byBase) {
    if (claimed.has(base)) continue;
    const m = newModel(base, entries, now);
    models.push(m);
    (m.type === "pending" ? pending : added).push(base);
  }
  return { db: { ...db, models, updated: now, source: "Artificial Analysis Data API (free tier)" }, added, pending };
}

const retryable = status => status === 429 || status >= 500;
const backoffMs = (res, attempt) => Math.min(Number(res.headers?.get?.("retry-after")) * 1000 || 2000 * 2 ** attempt, MAX_BACKOFF_MS);

/** One page, retrying 429 and 5xx up to MAX_RETRIES times (GET is idempotent). */
async function fetchPage(key, page, fetchFn, sleep) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetchFn(`${API}?page=${page}`, { headers: { "x-api-key": key }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (res.ok) return res.json();
    if (attempt === MAX_RETRIES || !retryable(res.status)) throw new Error(`Artificial Analysis API returned ${res.status} on page ${page}`);
    await sleep(backoffMs(res, attempt));
  }
}

/** Fetches every page of the free models list. */
export async function fetchAll(key, { fetchFn = fetch, sleep = ms => new Promise(r => setTimeout(r, ms)) } = {}) {
  const rows = [];
  let version = null;
  for (let page = 1; page < MAX_PAGES; page++) {
    const body = await fetchPage(key, page, fetchFn, sleep);
    if (!Array.isArray(body.data)) throw new Error(`Unexpected response shape on page ${page}`);
    version ??= body.intelligence_index_version ?? null;
    rows.push(...body.data);
    if (!body.pagination?.has_more) break;
  }
  return { rows, version };
}

/**
 * Refuses updates that would publish nonsense: too few models, a new major
 * Intelligence Index version (scores not comparable), or most known scores
 * jumping at once. Returns a reason string, or null when safe.
 */
export function sanityCheck(db, next, rows, version) {
  if (rows.length < MIN_MODELS) return `only ${rows.length} models returned`;
  const major = v => String(v ?? "").split(".")[0];
  if (version != null && db.aaIndexVersion && major(version) !== major(db.aaIndexVersion))
    return `Intelligence Index changed from v${db.aaIndexVersion} to v${version}: the IQ formula needs recalibrating`;
  const before = new Map(db.models.map(m => [m.name, Math.max(...m.modes.map(x => x.aa))]));
  const known = next.models.filter(m => before.has(m.name));
  const jumped = known.filter(m => Math.abs(Math.max(...m.modes.map(x => x.aa)) - before.get(m.name)) > MAX_SCORE_JUMP);
  if (known.length >= 5 && jumped.length > known.length / 2) return `${jumped.length} of ${known.length} models moved more than ${MAX_SCORE_JUMP} points`;
  return null;
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("scripts/update-from-aa.mjs")) {
  const key = process.env.AA_API_KEY;
  if (!key) { console.log("AA_API_KEY not set: skipping data refresh."); process.exit(0); }
  const db = JSON.parse(readFileSync(file, "utf8"));
  const { rows, version } = await fetchAll(key);
  const { db: next, added, pending } = merge(db, rows, new Date().toISOString().slice(0, 19) + "Z");
  const problem = sanityCheck(db, next, rows, version);
  if (problem) { console.log(`REFUSED: ${problem}. Keeping the last good data.`); process.exit(0); }
  const changed = JSON.stringify(next.models) !== JSON.stringify(db.models);
  writeFileSync(file, JSON.stringify(changed ? next : db, null, 1) + "\n");
  console.log(`models from API: ${rows.length}; changed: ${changed}; added: ${added.join(", ") || "none"}`);
  if (pending.length) console.log(`PENDING: ${pending.join(" | ")}`);
}
