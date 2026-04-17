/**
 * Benchmark: pivotTable with multiple aggfuncs (sum, count, min, max) on 50k-row DataFrame.
 * Outputs JSON: {"function": "pivot_table_aggfunc_variants", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, pivotTable } from "../../src/index.ts";

const ROWS = 50_000;
const WARMUP = 3;
const ITERATIONS = 20;

const regions = ["North", "South", "East", "West"];
const categories = ["A", "B", "C", "D", "E"];

const region = Array.from({ length: ROWS }, (_, i) => regions[i % regions.length] as string);
const category = Array.from({ length: ROWS }, (_, i) => categories[i % categories.length] as string);
const sales = Array.from({ length: ROWS }, (_, i) => (i % 1000) * 1.5 + 10);

const df = DataFrame.fromColumns({ region, category, sales });

for (let i = 0; i < WARMUP; i++) {
  pivotTable(df, { values: "sales", index: "region", columns: "category", aggfunc: "sum" });
  pivotTable(df, { values: "sales", index: "region", columns: "category", aggfunc: "count" });
  pivotTable(df, { values: "sales", index: "region", columns: "category", aggfunc: "min" });
  pivotTable(df, { values: "sales", index: "region", columns: "category", aggfunc: "max" });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  pivotTable(df, { values: "sales", index: "region", columns: "category", aggfunc: "sum" });
  pivotTable(df, { values: "sales", index: "region", columns: "category", aggfunc: "count" });
  pivotTable(df, { values: "sales", index: "region", columns: "category", aggfunc: "min" });
  pivotTable(df, { values: "sales", index: "region", columns: "category", aggfunc: "max" });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "pivot_table_aggfunc_variants",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
