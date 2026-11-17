import { test } from "node:test";
import assert from "node:assert/strict";
import { splitName, classify, merge, fetchAll } from "../scripts/update-from-aa.mjs";
import { pick } from "../scripts/pick.mjs";

const row = (name, idx, creator = "Anthropic", date = "2026-11-01", slug = "x") =>
  ({ name, slug, release_date: date, model_creator: { name: creator }, evaluations: { artificial_analysis_intelligence_index: idx } });
const db = () => ({
  updated: "2026-11-10T00:00:00Z",
  models: [
    { name: "Claude Opus 5.5", org: "Anthropic", type: "closed", aaNames: ["Claude Opus 5.5"], aaSlug: "claude-opus-5-5", released: "2026-09",
      params: { total: "~3T", active: null, disclosed: false }, modes: [{ mode: "max", aa: 59 }], trackingai: { max: { offline: 134, mensa: 148, label: "x" } } },
    { name: "Kimi K3.1 Pro", org: "Kimi", type: "open", aaNames: ["Kimi K3.1 Pro"], aaSlug: "kimi-k3-1-pro", released: "2026-10",
      params: { total: "2.8T", active: "104B", disclosed: true }, modes: [{ mode: "thinking", aa: 46 }], trackingai: {} },
  ],
});

test("splitName separates the thinking mode from the model name", () => {
  assert.deepEqual(splitName("Claude Opus 5.5 (max)"), { base: "Claude Opus 5.5", mode: "max" });
  assert.deepEqual(splitName("Kimi K3.1 Pro"), { base: "Kimi K3.1 Pro", mode: null });
  assert.deepEqual(splitName("GPT-6 Sol (Daybreak Blue, max)"), { base: "GPT-6 Sol", mode: "Daybreak Blue, max" });
});

test("classify uses name rules before creator defaults, and flags unknown creators", () => {
  assert.equal(classify("gpt-oss-200b", "OpenAI"), "open");
  assert.equal(classify("GPT-7", "OpenAI"), "closed");
  assert.equal(classify("Qwen3.9 Max", "Alibaba"), "closed");
  assert.equal(classify("Qwen3.9 32B", "Alibaba"), "open");
  assert.equal(classify("Some Model", "New Lab"), "pending");
});

test("merge updates scores and modes of known models, keeping curated fields", () => {
  const { db: out } = merge(db(), [row("Claude Opus 5.5 (max)", 61.4), row("Claude Opus 5.5 (high)", 53)], "2026-11-11T00:00:00Z");
  const opus = out.models.find(m => m.name === "Claude Opus 5.5");
  assert.deepEqual(opus.modes, [{ mode: "max", aa: 61 }, { mode: "high", aa: 53 }]);
  assert.equal(opus.params.total, "~3T");
  assert.equal(opus.trackingai.max.offline, 134);
  assert.equal(opus.released, "2026-11");
});

test("merge keeps a single-mode model's label and keeps models missing from the API", () => {
  const { db: out } = merge(db(), [row("Kimi K3.1 Pro", 47, "Kimi")], "2026-11-11T00:00:00Z");
  assert.deepEqual(out.models.find(m => m.name === "Kimi K3.1 Pro").modes, [{ mode: "thinking", aa: 47 }]);
  const { db: out2 } = merge(db(), [], "2026-11-11T00:00:00Z");
  assert.deepEqual(out2.models.find(m => m.name === "Kimi K3.1 Pro").modes, [{ mode: "thinking", aa: 46 }]);
});

test("a new model appears the same day: classified ones are added, unknown ones held as pending", () => {
  const { db: out, added, pending } = merge(db(), [row("Claude Opus 6 (max)", 70), row("Claude Opus 6 (low)", 40), row("Mystery 1", 50, "New Lab")], "2026-11-11T00:00:00Z");
  assert.deepEqual(added, ["Claude Opus 6"]);
  assert.deepEqual(pending, ["Mystery 1"]);
  const top = pick(out.models);
  assert.equal(top[0].name, "Claude Opus 6");
  assert.ok(!top.some(m => m.name === "Mystery 1"));
});

test("models without a benchmark score are ignored", () => {
  const { added } = merge(db(), [row("Unscored (max)", null)], "2026-11-11T00:00:00Z");
  assert.deepEqual(added, []);
});

test("a mode missing from today's list keeps its last score and TrackingAI result (#78)", () => {
  const { db: out } = merge(db(), [row("Claude Opus 5.5 (high)", 60)], "2026-11-11T00:00:00Z");
  const opus = out.models.find(m => m.name === "Claude Opus 5.5");
  assert.deepEqual(opus.modes, [{ mode: "high", aa: 60 }, { mode: "max", aa: 59 }]);
  assert.equal(opus.trackingai.max.offline, 134);
});

test("fetchAll reads up to 50 pages and refuses a list still cut off after them (#78)", async () => {
  let pages = 0;
  const fetchFn = async () => ({ ok: true, json: async () => { pages++; return { data: [], pagination: { has_more: pages < 50 } }; } });
  const { rows } = await fetchAll("k", { fetchFn, sleep: async () => {} });
  assert.deepEqual(rows, []);
  assert.equal(pages, 50);
  pages = 0;
  const endless = async () => ({ ok: true, json: async () => { pages++; return { data: [], pagination: { has_more: true } }; } });
  await assert.rejects(fetchAll("k", { fetchFn: endless, sleep: async () => {} }), /still has more pages/);
  assert.equal(pages, 50);
});

test("merge lists each mode once, and a lone mode keeps its label when new modes appear (#80)", () => {
  const now = "2026-11-11T00:00:00Z";
  const { db: out } = merge(db(), [row("Kimi K3.1 Pro", 47, "Kimi"), row("Kimi K3.1 Pro (Non-reasoning)", 30, "Kimi")], now);
  assert.deepEqual(out.models.find(m => m.name === "Kimi K3.1 Pro").modes, [{ mode: "thinking", aa: 47 }, { mode: "Non-reasoning", aa: 30 }]);
  const { db: out2 } = merge(db(), [row("Claude Opus 5.5 (max)", 61), row("Claude Opus 5.5 (max)", 58)], now);
  assert.deepEqual(out2.models.find(m => m.name === "Claude Opus 5.5").modes, [{ mode: "max", aa: 61 }]);
  const { db: out3 } = merge(db(), [row("Claude Opus 6", 50), row("Claude Opus 6 (standard)", 49)], now);
  assert.deepEqual(out3.models.find(m => m.name === "Claude Opus 6").modes, [{ mode: "standard", aa: 50 }]);
});
