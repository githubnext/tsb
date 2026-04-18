/**
 * Benchmark: crosstab() with normalize options — proportions by row/col/all.
 * Outputs JSON: {"function": "crosstab_normalize", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, crosstab } from "../../src/index.ts";

const SIZE = 50_000;
const WARMUP = 5;
const ITERATIONS = 30;

let seed = 99;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
  return seed;
};

const choices_a = ["north", "south", "east", "west"];
const choices_b = ["red", "green", "blue"];

const a = new Series({ data: Array.from({ length: SIZE }, () => choices_a[rand() % 4]) });
const b = new Series({ data: Array.from({ length: SIZE }, () => choices_b[rand() % 3]) });

for (let i = 0; i < WARMUP; i++) {
  crosstab(a, b, { normalize: true });
  crosstab(a, b, { normalize: "index" });
  crosstab(a, b, { normalize: "columns" });
}

const times: number[] = [];
for (let i = 0; i < ITERATIONS; i++) {
  const t0 = performance.now();
  crosstab(a, b, { normalize: true });
  crosstab(a, b, { normalize: "index" });
  crosstab(a, b, { normalize: "columns" });
  times.push(performance.now() - t0);
}

const total_ms = times.reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify({
    function: "crosstab_normalize",
    mean_ms: Math.round((total_ms / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total_ms * 1000) / 1000,
  }),
);
