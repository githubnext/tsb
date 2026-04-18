/**
 * Benchmark: selectDtypes — filter DataFrame columns by dtype (include/exclude).
 * Outputs JSON: {"function": "select_dtypes_options", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, Series, selectDtypes } from "../../src/index.ts";

const ROWS = 50_000;
const WARMUP = 5;
const ITERATIONS = 30;

// Build a mixed-dtype DataFrame
const intCol = new Series({ data: Int32Array.from({ length: ROWS }, (_, i) => i) });
const floatCol = new Series({ data: Float64Array.from({ length: ROWS }, (_, i) => i * 1.5) });
const boolCol = new Series({ data: Array.from({ length: ROWS }, (_, i) => i % 2 === 0) });
const strCol = new Series({ data: Array.from({ length: ROWS }, (_, i) => `s_${i % 100}`) });
const df = DataFrame.fromColumns({ intCol, floatCol, boolCol, strCol });

for (let i = 0; i < WARMUP; i++) {
  selectDtypes(df, { include: "number" });
  selectDtypes(df, { exclude: "number" });
  selectDtypes(df, { include: ["integer", "float"] });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const start = performance.now();
  selectDtypes(df, { include: "number" });
  selectDtypes(df, { exclude: "number" });
  selectDtypes(df, { include: ["integer", "float"] });
  times.push(performance.now() - start);
}

const totalMs = times.reduce((a, b) => a + b, 0);
const meanMs = totalMs / ITERATIONS;
console.log(
  JSON.stringify({
    function: "select_dtypes_options",
    mean_ms: Math.round(meanMs * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(totalMs * 1000) / 1000,
  }),
);
