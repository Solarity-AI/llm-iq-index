import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../fonts.css", import.meta.url), "utf8");

test("page loads no third-party resources (fonts are self-hosted)", () => {
  // canonical links are not fetched by browsers, so they are not loads
  const loads = [...html.matchAll(/<(?:link|script)[^>]+(?:href|src)="([^"]+)"[^>]*>/g)].filter(m => !/rel="canonical"/.test(m[0])).map(m => m[1]);
  assert.deepEqual(loads.filter(u => /^https?:|^\/\//.test(u)), []);
  assert.doesNotMatch(css, /https?:\/\//);
});

test("CSP only allows same-origin fonts and styles", () => {
  const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  assert.match(csp, /font-src 'self'/);
  assert.doesNotMatch(csp, /googleapis|gstatic/);
});

test("share metadata points at files the site actually deploys", () => {
  const wf = readFileSync(new URL("../.github/workflows/site.yml", import.meta.url), "utf8");
  for (const f of ["og.png", "robots.txt", "sitemap.xml"]) assert.match(wf, new RegExp(`cp [^\n]*${f.replace(".", "\.")}`), f);
  assert.match(html, /property="og:image" content="https:\/\/solarity-ai\.github\.io\/llm-iq-index\/og\.png"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
});
