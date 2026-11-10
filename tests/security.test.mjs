import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("page declares a Content-Security-Policy that forbids inline script", () => {
  const m = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/);
  assert.ok(m, "CSP meta missing");
  assert.match(m[1], /script-src 'self'(;|$)/);
  assert.doesNotMatch(m[1], /script-src[^;]*unsafe-inline/);
});

test("no inline <script> blocks remain", () => {
  assert.doesNotMatch(html, /<script>(?!<\/script>)/);
});

test("page sets a referrer policy", () => {
  assert.match(html, /<meta name="referrer" content="strict-origin-when-cross-origin">/);
});

test("header shows when the data was last updated (regression #18)", () => {
  assert.match(html, /<span id="upd">/);
});
