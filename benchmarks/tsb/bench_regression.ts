/**
 * Benchmark: linregress + OLS regression on 10,000-row dataset.
 * Tests simple linear regression (linregress) and multiple OLS (.fit).
 */
import { linregress, OLS, Series, DataFrame } from "../../src/index.js";

const N = 10_000;
const WARMUP = 5;
const ITERATIONS = 20;

// Generate synthetic data
const x = Float64Array.from({ length: N }, (_, i) => i / N);
const noise = Float64Array.from({ length: N }, (_, i) => Math.sin(i * 0.37) * 0.1);
const y = Float64Array.from({ length: N }, (_, i) => 2.5 * x[i] + 1.2 + noise[i]);

const xArr = Array.from(x);
const yArr = Array.from(y);

// OLS setup: two predictors
const x2 = Float64Array.from({ length: N }, (_, i) => Math.cos(i * 0.1));
const X = DataFrame.fromArrays({ x1: xArr, x2: Array.from(x2) });
const ySeries = new Series(yArr);
const ols = new OLS();

// Warm up
for (let i = 0; i < WARMUP; i++) {
  linregress(xArr, yArr);
  ols.fit(X, ySeries);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  linregress(xArr, yArr);
  ols.fit(X, ySeries);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "regression",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
