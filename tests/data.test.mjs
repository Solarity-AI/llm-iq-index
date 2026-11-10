import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const js = readFileSync(new URL("../app.js", import.meta.url), "utf8");
// Model rows look like: ["Name","Org","open"|"closed",[...modes],{...}]
const models = [...js.matchAll(/^\["([^"]+)","[^"]+","(open|closed)"/gm)].map(m => ({ name: m[1], open: m[2] === "open" }));
const meta = JSON.parse("{" + js.match(/const META=\{\n([\s\S]*?)\n\};/)[1] + "}");

test("every model has release date and parameter metadata", () => {
  assert.equal(models.length, 20);
  for (const { name } of models) {
    assert.ok(meta[name], `missing META for ${name}`);
    assert.match(meta[name][1], /^20\d\d-(0[1-9]|1[0-2])$/, `bad date for ${name}`);
    assert.match(meta[name][2], /^~?\d+(\.\d+)?[BT]$/, `bad params for ${name}`);
  }
});

test("only open-weight models claim disclosed parameter counts", () => {
  for (const { name, open } of models) {
    assert.equal(Boolean(meta[name][4]), open, name);
    assert.equal(meta[name][2].startsWith("~"), !open, name);
  }
});
