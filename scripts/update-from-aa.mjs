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

/** Merges API rows into the database. Pure: returns { db, added, pending }. */
export function merge(db, apiRows, now) {
  const byBase = new Map();
  for (const r of apiRows) {
    const idx = r.evaluations?.artificial_analysis_intelligence_index;
    if (idx == null) continue;
    const { base, mode } = splitName(r.name);
    if (!byBase.has(base)) byBase.set(base, []);
    byBase.get(base).push({ mode, aa: Math.round(idx), slug: r.slug, date: r.release_date, creator: r.model_creator?.name });
  }
  const models = db.models.map(m => ({ ...m }));
  const claimed = new Set();
  for (const m of models) {
    const entries = m.aaNames.flatMap(n => (byBase.get(n) || []).map(e => ({ ...e, prefix: n === m.aaNames[0] ? "" : n.replace(m.aaNames[0], "").trim() })));
    m.aaNames.forEach(n => claimed.add(n));
    if (!entries.length) continue; // not listed today: keep last known values
    const single = m.modes.length === 1 && entries.length === 1;
    m.modes = entries.map(e => ({ mode: single && !e.mode ? m.modes[0].mode : [e.prefix, e.mode || "standard"].filter(Boolean).join(" "), aa: e.aa }))
      .sort((a, b) => b.aa - a.aa);
    const dates = entries.map(e => e.date).filter(Boolean).sort();
    if (dates.length) m.released = dates[0].slice(0, 7);
  }
  const added = [], pending = [];
  for (const [base, entries] of byBase) {
    if (claimed.has(base)) continue;
    const type = classify(base, entries[0].creator);
    const dates = entries.map(e => e.date).filter(Boolean).sort();
    const m = {
      name: base, org: entries[0].creator || "Unknown", type, aaNames: [base],
      aaSlug: entries.find(e => e.slug)?.slug || "", released: (dates[0] || now).slice(0, 7),
      params: { total: null, active: null, disclosed: false },
      modes: entries.map(e => ({ mode: e.mode || "standard", aa: e.aa })).sort((a, b) => b.aa - a.aa),
      trackingai: {}, addedAt: now,
    };
    models.push(m);
    (type === "pending" ? pending : added).push(base);
  }
  return { db: { ...db, models, updated: now, source: "Artificial Analysis Data API (free tier)" }, added, pending };
}

async function fetchAll(key) {
  const rows = [];
  for (let page = 1; page < 50; page++) {
    const res = await fetch(`${API}?page=${page}`, { headers: { "x-api-key": key }, signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`Artificial Analysis API returned ${res.status} on page ${page}`);
    const body = await res.json();
    rows.push(...body.data);
    if (!body.pagination?.has_more) break;
  }
  return rows;
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("scripts/update-from-aa.mjs")) {
  const key = process.env.AA_API_KEY;
  if (!key) { console.log("AA_API_KEY not set: skipping data refresh."); process.exit(0); }
  const db = JSON.parse(readFileSync(file, "utf8"));
  const rows = await fetchAll(key);
  if (rows.length < 20) throw new Error(`Only ${rows.length} models returned: refusing to update.`);
  const { db: next, added, pending } = merge(db, rows, new Date().toISOString().slice(0, 19) + "Z");
  const changed = JSON.stringify(next.models) !== JSON.stringify(db.models);
  writeFileSync(file, JSON.stringify(changed ? next : db, null, 1) + "\n");
  console.log(`models from API: ${rows.length}; changed: ${changed}; added: ${added.join(", ") || "none"}`);
  if (pending.length) console.log(`PENDING: ${pending.join(" | ")}`);
}
