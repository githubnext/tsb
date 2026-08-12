/**
 * Benchmark: resample_agg_fn — SeriesResampler.agg() with a custom aggregation
 * function (the ResampleAggFn code path), as opposed to a named aggregation.
 *
 * Mirrors pandas: pd.Series.resample("1h").agg(lambda x: x.quantile(0.75))
 * and              pd.Series.resample("1h").agg(lambda x: x.max() - x.min())
 *
 * 50 k-row minute-resolution Series; 30 measured iterations.
 *
 * Outputs JSON: {"function": "resample_agg_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { Series, resampleSeries } from "../../src/index.ts";
import type { Scalar } from "../../src/types.ts";

const SIZE = 50_000;
const WARMUP = 3;
const ITERATIONS = 30;

const base = new Date("2020-01-01T00:00:00Z").getTime();
const idx = Array.from({ length: SIZE }, (_, i) => new Date(base + i * 60_000));
const data = Array.from({ length: SIZE }, (_, i) => Math.sin(i * 0.05) * 50 + 50);
const s = new Series({ data, index: idx });

// Custom agg: 75th-percentile per hour bin
const p75 = (vals: readonly (string | number | boolean | null | undefined)[]) => {
  const ns = (vals.filter((v) => typeof v === "number" && Number.isFinite(v)) as number[]).sort(
    (a, b) => a - b,
  );
  if (ns.length === 0) return Number.NaN;
  const pos = (ns.length - 1) * 0.75;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return lo === hi ? (ns[lo] as number) : (ns[lo] as number) * (hi - pos) + (ns[hi] as number) * (pos - lo);
};

// Custom agg: range (max - min) per bin
const rangeAgg = (vals: readonly (string | number | boolean | null | undefined)[]) => {
  const ns = vals.filter((v) => typeof v === "number" && Number.isFinite(v)) as number[];
  if (ns.length === 0) return Number.NaN;
  return Math.max(...ns) - Math.min(...ns);
};

for (let i = 0; i < WARMUP; i++) {
  resampleSeries(s, "H").agg(p75);
  resampleSeries(s, "H").agg(rangeAgg);
}

const t0 = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  resampleSeries(s, "H").agg(p75);
  resampleSeries(s, "H").agg(rangeAgg);
}
const elapsed = performance.now() - t0;

console.log(
  JSON.stringify({
    function: "resample_agg_fn",
    mean_ms: elapsed / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: elapsed,
  }),
);
