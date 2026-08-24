/**
 * Benchmark: swapLevelDataFrame / reorderLevelsDataFrame on 50k-row MultiIndex DataFrame.
 *
 * Mirrors pandas:
 *   - DataFrame.swaplevel(i, j, axis=0)     → swapLevelDataFrame
 *   - DataFrame.reorder_levels(order, axis=0) → reorderLevelsDataFrame
 *
 * Dataset: 50 000-row × 3-column DataFrame with a 3-level MultiIndex row index.
 *
 * Outputs JSON: {"function": "swaplevel_dataframe", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, MultiIndex, swapLevelDataFrame, reorderLevelsDataFrame } from "../../src/index.ts";

const N = 50_000;
const WARMUP = 5;
const ITERATIONS = 30;

const levA = Array.from({ length: N }, (_, i) => `a${i % 100}`);
const levB = Array.from({ length: N }, (_, i) => i % 500);
const levC = Array.from({ length: N }, (_, i) => i % 10);
const tuples: [string, number, number][] = levA.map((v, i) => [v, levB[i], levC[i]]);
const idx = new MultiIndex({ tuples });

const df = DataFrame.fromColumns(
  {
    x: Array.from({ length: N }, (_, i) => i * 1.0),
    y: Array.from({ length: N }, (_, i) => i * 2.0),
    z: Array.from({ length: N }, (_, i) => i * 3.0),
  },
  { index: idx },
);

for (let i = 0; i < WARMUP; i++) {
  swapLevelDataFrame(df, 0, 1);
  swapLevelDataFrame(df, 0, 2);
  reorderLevelsDataFrame(df, [2, 0, 1]);
  reorderLevelsDataFrame(df, [1, 2, 0]);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  swapLevelDataFrame(df, 0, 1);
  swapLevelDataFrame(df, 0, 2);
  reorderLevelsDataFrame(df, [2, 0, 1]);
  reorderLevelsDataFrame(df, [1, 2, 0]);
}
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "swaplevel_dataframe",
    mean_ms: total_ms / ITERATIONS,
    iterations: ITERATIONS,
    total_ms,
  }),
);
