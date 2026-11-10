import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fetchAll, sanityCheck, merge } from "../scripts/update-from-aa.mjs";

const page = (data, has_more = false) => ({ ok: true, status: 200, headers: new Map(), json: async () => ({ intelligence_index_version: "5.0", data, pagination: { has_more } }) });
const fail = status => ({ ok: false, status, headers: new Map() });
const noSleep = async () => {};

test("fetchAll retries 429 and 5xx, then succeeds", async () => {
  const replies = [fail(503), fail(429), page([{ name: "a" }])];
  const { rows } = await fetchAll("k", { fetchFn: async () => replies.shift(), sleep: noSleep });
  assert.equal(rows.length, 1);
});

test("fetchAll gives up after 3 retries and does not retry a 401", async () => {
  let calls = 0;
  await assert.rejects(fetchAll("k", { fetchFn: async () => (calls++, fail(500)), sleep: noSleep }), /500/);
  assert.equal(calls, 4);
  calls = 0;
  await assert.rejects(fetchAll("k", { fetchFn: async () => (calls++, fail(401)), sleep: noSleep }), /401/);
  assert.equal(calls, 1);
});

test("fetchAll follows pagination and rejects a malformed body", async () => {
  const replies = [page([{ name: "a" }], true), page([{ name: "b" }])];
  assert.equal((await fetchAll("k", { fetchFn: async () => replies.shift(), sleep: noSleep })).rows.length, 2);
  await assert.rejects(fetchAll("k", { fetchFn: async () => ({ ok: true, json: async () => ({}) }), sleep: noSleep }), /shape/);
});

const db = JSON.parse(readFileSync(new URL("../data/models.json", import.meta.url), "utf8"));
const apiRows = (shift = 0) => db.models.flatMap(m => m.modes.map(x => ({
  name: `${m.aaNames[0]} (${x.mode})`, slug: m.aaSlug, release_date: `${m.released}-01`,
  model_creator: { name: m.org }, evaluations: { artificial_analysis_intelligence_index: x.aa + shift } })));

test("sanityCheck accepts a normal refresh", () => {
  const rows = apiRows(1);
  assert.equal(sanityCheck(db, merge(db, rows, "t").db, rows, "5.0"), null);
});

test("sanityCheck refuses a new major index version, too few rows, or a mass score jump", () => {
  const rows = apiRows();
  assert.match(sanityCheck(db, merge(db, rows, "t").db, rows, "6.0"), /recalibrating/);
  assert.match(sanityCheck(db, merge(db, rows.slice(0, 5), "t").db, rows.slice(0, 5), "5.0"), /only 5/);
  const jumped = apiRows(30);
  assert.match(sanityCheck(db, merge(db, jumped, "t").db, jumped, "5.0"), /moved more than 15/);
});

test("the page shows a message instead of empty tables when data.js fails to load", () => {
  const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app.split("\n")[0], /typeof rows==="undefined"/);
  assert.ok(app.split("\n")[0].includes('role="alert"'));
});
