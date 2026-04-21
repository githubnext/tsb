/**
 * Benchmark: dataFrameToString + seriesToString with float formatting options.
 * Outputs JSON: {"function": "format_ops_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import {
  Series,
  formatFloat,
  formatPercent,
  formatScientific,
  formatEngineering,
  formatThousands,
  formatCurrency,
  formatCompact,
} from "../../src/index.ts";

const SIZE = 10_000;
const WARMUP = 5;
const ITERATIONS = 50;

const values = Array.from({ length: SIZE }, (_, i) => i * 1234.567 + 0.001);

for (let i = 0; i < WARMUP; i++) {
  for (const v of values.slice(0, 100)) {
    formatFloat(v);
    formatPercent(v / 100_000);
    formatScientific(v);
  }
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  for (const v of values) {
    formatFloat(v, 2);
    formatPercent(v / 100_000, 1);
    formatScientific(v, 3);
    formatEngineering(v);
    formatThousands(v);
    formatCurrency(v);
    formatCompact(v);
  }
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "format_ops_fn",
    mean_ms: Math.round((total / ITERATIONS) * 1000) / 1000,
    iterations: ITERATIONS,
    total_ms: Math.round(total * 1000) / 1000,
  }),
);
