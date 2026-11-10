import { test } from "node:test";
import assert from "node:assert/strict";
import { loadData } from "./helpers.mjs";
const { rows, iqFor, topModels, rel } = loadData();

test("IQ maps the AA index linearly: 100 + 0.6 × index, rounded", () => {
  assert.equal(iqFor(0), 100);
  assert.equal(iqFor(65), 139);
  assert.equal(iqFor(46), 128); // 127.6 rounds up
});

test("a TrackingAI-tested mode averages the mapped score with the offline IQ", () => {
  assert.equal(iqFor(59, [134, 148, "x"]), 135); // (135.4 + 134) / 2 = 134.7
  const opusMax = rows.find(r => r.name === "Claude Opus 5.5" && r.mode === "max");
  assert.equal(opusMax.iq, 135);
  assert.equal(opusMax.a[0], 134);
});

test("rows are ranked by IQ, ties broken by AA index", () => {
  for (let i = 1; i < rows.length; i++) {
    const [p, c] = [rows[i - 1], rows[i]];
    assert.ok(p.iq > c.iq || (p.iq === c.iq && p.aa >= c.aa), `${p.name} ${p.mode} before ${c.name} ${c.mode}`);
  }
});

test("leaderboard sizes: 60 overall, 43 closed, 17 open", () => {
  assert.equal(rows.length, 60);
  assert.equal(rows.filter(r => r.type === "closed").length, 43);
  assert.equal(rows.filter(r => r.type === "open").length, 17);
});

test("regression #3: the podium shows three different models", () => {
  const top = topModels(3);
  assert.deepEqual([...top.map(r => r.name)], ["Claude Fable 5.2", "Gemini 4 Carbon", "Claude Opus 5.5"]);
  assert.equal(new Set(top.map(r => r.name)).size, 3);
});

test("release months render as short month and year", () => {
  assert.equal(rel("gpt-oss-120b"), "Aug 2025");
  assert.equal(rel("Claude Fable 5.2"), "Nov 2026");
});
