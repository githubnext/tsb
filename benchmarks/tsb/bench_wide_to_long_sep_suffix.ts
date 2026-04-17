/**
 * Benchmark: wideToLong with sep and suffix options — different column naming patterns.
 * Outputs JSON: {"function": "wide_to_long_sep_suffix", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { DataFrame, wideToLong } from "../../src/index.ts";

const ROWS = 5_000;
const WARMUP = 3;
const ITERATIONS = 20;

// Dataset 1: underscore-separated columns (A_1, A_2, B_1, B_2)
const ids = Array.from({ length: ROWS }, (_, i) => i);
const df1 = DataFrame.fromColumns({
  id: ids,
  A_1: ids.map((i) => i * 1.0),
  A_2: ids.map((i) => i * 1.1),
  A_3: ids.map((i) => i * 1.2),
  B_1: ids.map((i) => i * 2.0),
  B_2: ids.map((i) => i * 2.1),
  B_3: ids.map((i) => i * 2.2),
});

// Dataset 2: string suffix pattern (score_Q1, score_Q2, score_Q3)
const df2 = DataFrame.fromColumns({
  student: ids.map((i) => `s${i}`),
  score_Q1: ids.map((i) => i + 10),
  score_Q2: ids.map((i) => i + 20),
  score_Q3: ids.map((i) => i + 30),
});

for (let i = 0; i < WARMUP; i++) {
  wideToLong(df1, ["A", "B"], "id", "period", { sep: "_" });
  wideToLong(df2, "score", "student", "quarter", { sep: "_", suffix: /Q\d+/ });
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  wideToLong(df1, ["A", "B"], "id", "period", { sep: "_" });
  wideToLong(df2, "score", "student", "quarter", { sep: "_", suffix: /Q\d+/ });
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "wide_to_long_sep_suffix",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
