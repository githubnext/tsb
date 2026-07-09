/**
 * Benchmark: OLS (Ordinary Least Squares) multiple regression on 10k rows × 5 predictors
 */
import { OLS } from "../../src/index.js";

const ROWS = 10_000;
const WARMUP = 5;
const ITERATIONS = 20;

// Reproducible design matrix: 5 predictors with known coefficients
const rng = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 4294967296;
  };
};
const rand = rng(42);

const X: number[][] = Array.from({ length: ROWS }, () =>
  Array.from({ length: 5 }, () => rand() * 2 - 1),
);
// y = 1*x1 + 2*x2 - 0.5*x3 + 3*x4 + 0.1*x5 + noise
const y: number[] = X.map((row) => {
  const [x1, x2, x3, x4, x5] = row as [number, number, number, number, number];
  return x1 + 2 * x2 - 0.5 * x3 + 3 * x4 + 0.1 * x5 + (rand() - 0.5) * 0.1;
});

const model = new OLS();

for (let i = 0; i < WARMUP; i++) {
  model.fit(X, y);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  model.fit(X, y);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "ols",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
