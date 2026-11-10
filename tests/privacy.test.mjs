import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../fonts.css", import.meta.url), "utf8");

test("page loads no third-party resources (fonts are self-hosted)", () => {
  const loads = [...html.matchAll(/<(?:link|script)[^>]+(?:href|src)="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(loads.filter(u => /^https?:|^\/\//.test(u)), []);
  assert.doesNotMatch(css, /https?:\/\//);
});

test("CSP only allows same-origin fonts and styles", () => {
  const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  assert.match(csp, /font-src 'self'/);
  assert.doesNotMatch(csp, /googleapis|gstatic/);
});
