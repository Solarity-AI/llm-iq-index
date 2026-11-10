import { readFileSync } from "node:fs";
import vm from "node:vm";
/** Runs data.js in a sandbox (as the browser does) and returns its globals. */
export function loadData() {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(readFileSync(new URL("../data.js", import.meta.url), "utf8") + "\n;globalThis.__out={M,META,rows,iqFor,topModels,rel};", ctx);
  return ctx.__out;
}
