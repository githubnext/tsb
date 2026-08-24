/**
 * Benchmark: toMarkdown / toLaTeX / seriesToMarkdown on a 1000-row DataFrame
 */
import { DataFrame, Series, toMarkdown, toLaTeX, seriesToMarkdown } from "../../src/index.js";

const ROWS = 1_000;
const WARMUP = 3;
const ITERATIONS = 20;

const data: Record<string, number[]> = {
  a: Array.from({ length: ROWS }, (_, i) => i * 1.1),
  b: Array.from({ length: ROWS }, (_, i) => Math.sin(i) * 100),
  c: Array.from({ length: ROWS }, (_, i) => i % 7),
};
const df = new DataFrame(data);
const s = new Series(Array.from({ length: ROWS }, (_, i) => i * 2.5), { name: "x" });

for (let i = 0; i < WARMUP; i++) {
  toMarkdown(df);
  toLaTeX(df);
  seriesToMarkdown(s);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  toMarkdown(df);
  toLaTeX(df);
  seriesToMarkdown(s);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "format_table",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
