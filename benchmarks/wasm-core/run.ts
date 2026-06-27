/**
 * Rust/WASM vs TypeScript benchmark runner for core functions.
 *
 * Usage: BENCHMARK_WORKERS=2 BENCHMARK_TIMEOUT=60 bun run bench:wasm-core
 *
 * Output: benchmarks/results-wasm-core.json
 *
 * The output JSON has the shape expected by the evidence verification script:
 * {
 *   "benchmarks": [{ "function": "...", "tsb": {...}, "tsb_wasm": {...} }],
 *   "coverage": { "unclassified": 0, "eligible_missing": 0, "total_core_entries": N }
 * }
 */

import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

// ─── imports ─────────────────────────────────────────────────────────────────

const __dir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dir, "../..");
const _require = createRequire(import.meta.url);

// TypeScript implementations
const { searchsorted, searchsortedMany, argsortScalars } = await import(
  `${repoRoot}/src/core/searchsorted.ts`
);
const { natCompare, natSorted, natArgSort } = await import(
  `${repoRoot}/src/core/natsort.ts`
);

// WASM module
let wasmMod: Record<string, unknown> | null = null;
try {
  wasmMod = _require(`${repoRoot}/rust/pkg/tsb_wasm.js`) as Record<string, unknown>;
  console.log("WASM module loaded successfully.");
} catch (e) {
  console.error("ERROR: WASM module could not be loaded:", e);
  console.error("Run `bun run wasm:build` first.");
  process.exit(1);
}

// ─── helpers ─────────────────────────────────────────────────────────────────

interface BenchResult {
  mean_ms: number;
  iterations: number;
  total_ms: number;
}

interface BenchmarkEntry {
  function: string;
  tsb: BenchResult;
  tsb_wasm: BenchResult;
  wasm_speedup: number;
  notes?: string;
}

function bench(fn: () => unknown, iters: number): BenchResult {
  // Warm up
  for (let i = 0; i < Math.min(iters, 10); i++) fn();
  const start = performance.now();
  for (let i = 0; i < iters; i++) fn();
  const total = performance.now() - start;
  return { mean_ms: total / iters, iterations: iters, total_ms: total };
}

const ITERS = 1000;

// ─── benchmark helpers ────────────────────────────────────────────────────────

function getWasmFn(name: string): (...args: unknown[]) => unknown {
  if (wasmMod === null) throw new Error("WASM not loaded");
  const fn = wasmMod[name];
  if (typeof fn !== "function") throw new Error(`WASM function ${name} not found`);
  return fn as (...args: unknown[]) => unknown;
}

// ─── data fixtures ────────────────────────────────────────────────────────────

const SORTED_F64 = Array.from({ length: 10_000 }, (_, i) => i * 0.1);
const SORTED_F64_TA = new Float64Array(SORTED_F64);
const UNSORTED_F64 = Array.from({ length: 1_000 }, () => Math.random() * 1000);
const UNSORTED_F64_TA = new Float64Array(UNSORTED_F64);
const VALUES_F64 = [0.0, 250.5, 500.0, 750.1, 999.9];
const VALUES_F64_TA = new Float64Array(VALUES_F64);

const SORTED_STR = ["apple", "apricot", "banana", "cherry", "date", "elderberry", "fig", "grape"];
const UNSORTED_FILES = Array.from(
  { length: 100 },
  (_, i) => `file${Math.floor(Math.random() * 1000)}.txt`,
);

const benchmarks: BenchmarkEntry[] = [];

// ─── searchsorted_f64 ─────────────────────────────────────────────────────────

{
  const ssF64Wasm = getWasmFn("searchsorted_f64");
  const tsResult = bench(
    () => searchsorted(SORTED_F64, 500.0, { side: "left" }),
    ITERS,
  );
  const wasmResult = bench(
    () => ssF64Wasm(SORTED_F64_TA, 500.0, false),
    ITERS,
  );
  benchmarks.push({
    function: "searchsorted_f64",
    tsb: tsResult,
    tsb_wasm: wasmResult,
    wasm_speedup: tsResult.mean_ms / wasmResult.mean_ms,
  });
}

// ─── searchsorted_many_f64 ────────────────────────────────────────────────────

{
  const ssManyF64Wasm = getWasmFn("searchsorted_many_f64");
  const tsResult = bench(
    () => searchsortedMany(SORTED_F64, VALUES_F64, { side: "left" }),
    ITERS,
  );
  const wasmResult = bench(
    () => ssManyF64Wasm(SORTED_F64_TA, VALUES_F64_TA, false),
    ITERS,
  );
  benchmarks.push({
    function: "searchsorted_many_f64",
    tsb: tsResult,
    tsb_wasm: wasmResult,
    wasm_speedup: tsResult.mean_ms / wasmResult.mean_ms,
  });
}

// ─── argsort_f64 ──────────────────────────────────────────────────────────────

{
  const argsortF64Wasm = getWasmFn("argsort_f64");
  const tsResult = bench(() => argsortScalars(UNSORTED_F64), ITERS);
  const wasmResult = bench(() => argsortF64Wasm(UNSORTED_F64_TA), ITERS);
  benchmarks.push({
    function: "argsort_f64",
    tsb: tsResult,
    tsb_wasm: wasmResult,
    wasm_speedup: tsResult.mean_ms / wasmResult.mean_ms,
  });
}

// ─── searchsorted_str ─────────────────────────────────────────────────────────

{
  const ssStrWasm = getWasmFn("searchsorted_str");
  const tsResult = bench(
    () => searchsorted(SORTED_STR, "cherry", { side: "left" }),
    ITERS,
  );
  const wasmResult = bench(
    () => ssStrWasm([...SORTED_STR], "cherry", false),
    ITERS,
  );
  benchmarks.push({
    function: "searchsorted_str",
    tsb: tsResult,
    tsb_wasm: wasmResult,
    wasm_speedup: tsResult.mean_ms / wasmResult.mean_ms,
    notes: "String arrays are copied for each WASM call; raw kernel speedup is partially offset by copy overhead.",
  });
}

// ─── argsort_str ──────────────────────────────────────────────────────────────

{
  const argsortStrWasm = getWasmFn("argsort_str");
  const tsResult = bench(() => argsortScalars(SORTED_STR), ITERS);
  const wasmResult = bench(() => argsortStrWasm([...SORTED_STR]), ITERS);
  benchmarks.push({
    function: "argsort_str",
    tsb: tsResult,
    tsb_wasm: wasmResult,
    wasm_speedup: tsResult.mean_ms / wasmResult.mean_ms,
    notes: "Same array-copy caveat as searchsorted_str.",
  });
}

// ─── nat_compare ──────────────────────────────────────────────────────────────

{
  const natCmpWasm = getWasmFn("nat_compare");
  const tsResult = bench(() => natCompare("file100", "file99", {}), ITERS);
  const wasmResult = bench(() => natCmpWasm("file100", "file99", false, false), ITERS);
  benchmarks.push({
    function: "nat_compare",
    tsb: tsResult,
    tsb_wasm: wasmResult,
    wasm_speedup: tsResult.mean_ms / wasmResult.mean_ms,
  });
}

// ─── nat_sorted ───────────────────────────────────────────────────────────────

{
  const natSortedWasm = getWasmFn("nat_sorted");
  const tsResult = bench(() => natSorted([...UNSORTED_FILES], {}), ITERS);
  const wasmResult = bench(() => natSortedWasm([...UNSORTED_FILES], false, false), ITERS);
  benchmarks.push({
    function: "nat_sorted",
    tsb: tsResult,
    tsb_wasm: wasmResult,
    wasm_speedup: tsResult.mean_ms / wasmResult.mean_ms,
  });
}

// ─── nat_argsort ──────────────────────────────────────────────────────────────

{
  const natArgsortWasm = getWasmFn("nat_argsort");
  const tsResult = bench(() => natArgSort([...UNSORTED_FILES], {}), ITERS);
  const wasmResult = bench(() => natArgsortWasm([...UNSORTED_FILES], false, false), ITERS);
  benchmarks.push({
    function: "nat_argsort",
    tsb: tsResult,
    tsb_wasm: wasmResult,
    wasm_speedup: tsResult.mean_ms / wasmResult.mean_ms,
  });
}

// ─── coverage summary ─────────────────────────────────────────────────────────

const coverageManifest = JSON.parse(
  readFileSync(resolve(repoRoot, "wasm-coverage.json"), "utf-8"),
) as { summary: { total_core_entries: number; rust_wasm: number; ts_only_ineligible: number; unclassified: number; eligible_missing: number } };

const coverage = {
  unclassified: coverageManifest.summary.unclassified,
  eligible_missing: coverageManifest.summary.eligible_missing,
  total_core_entries: coverageManifest.summary.total_core_entries,
  rust_wasm: coverageManifest.summary.rust_wasm,
  ts_only_ineligible: coverageManifest.summary.ts_only_ineligible,
};

// ─── analysis: slower-than-TypeScript cases ───────────────────────────────────

const slowerCases = benchmarks.filter((b) => b.wasm_speedup < 1.0);
if (slowerCases.length > 0) {
  console.log("\nWASM slower than TypeScript cases:");
  for (const b of slowerCases) {
    console.log(
      `  ${b.function}: WASM ${(b.wasm_speedup * 100).toFixed(1)}% of TS speed` +
        (b.notes !== undefined ? ` (${b.notes})` : ""),
    );
  }
}

// ─── write results ─────────────────────────────────────────────────────────────

const results = {
  benchmarks,
  coverage,
  timestamp: new Date().toISOString(),
  slower_than_typescript: slowerCases.map((b) => ({
    function: b.function,
    wasm_speedup: b.wasm_speedup,
    explanation: b.notes ?? "WASM/JS boundary overhead exceeds kernel speedup at this array size.",
  })),
};

mkdirSync(resolve(repoRoot, "benchmarks"), { recursive: true });
const outPath = resolve(repoRoot, "benchmarks/results-wasm-core.json");
writeFileSync(outPath, JSON.stringify(results, null, 2));

console.log(`\nResults written to benchmarks/results-wasm-core.json`);
console.log(`Benchmarks: ${benchmarks.length} entries`);
console.log(`Coverage: ${coverage.rust_wasm} rust-wasm, ${coverage.ts_only_ineligible} ts-only-ineligible, ${coverage.unclassified} unclassified, ${coverage.eligible_missing} eligible-missing`);
