/**
 * Benchmark: groupby_get_group — DataFrameGroupBy.getGroup on 100k rows
 */
import { DataFrame, Series } from "../../src/index.js";

const ROWS = 100_000;
const WARMUP = 3;
const ITERATIONS = 20;

const groupKeys = Array.from({ length: ROWS }, (_, i) => `group_${i % 5}`);
const values = Array.from({ length: ROWS }, (_, i) => i);
const df = new DataFrame({
  data: { group: groupKeys, value: values },
});
const grouped = df.groupby("group");

for (let i = 0; i < WARMUP; i++) {
  grouped.getGroup("group_0");
  grouped.getGroup("group_1");
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  grouped.getGroup("group_0");
  grouped.getGroup("group_1");
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "groupby_get_group",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
