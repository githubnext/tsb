/**
 * Benchmark: GaussianKDE — kernel density estimation.
 *
 * Mirrors scipy.stats.gaussian_kde:
 *   - gaussianKDE(data)        — fit KDE to 1000-point dataset
 *   - kde.pdf(x)               — evaluate PDF at single point
 *   - kde.evaluate(points)     — evaluate PDF at 100 grid points
 *   - kde.integrate(a, b)      — integrate density over interval
 *   - kde.logPdf(x)            — log-PDF at single point
 *
 * Dataset: 1000 points, 100-point evaluation grid.
 * Outputs JSON: {"function": "kde", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { gaussianKDE } from "../../src/index.js";

const N = 1_000;
const GRID = 100;
const WARMUP = 5;
const ITERATIONS = 50;

// Bimodal dataset: mix of two Gaussians
const data = Array.from({ length: N }, (_, i) => {
  const u1 = Math.sin(i * 1.7) * 0.5 + (i % 2 === 0 ? -1.5 : 1.5);
  return u1;
});
const grid = Array.from({ length: GRID }, (_, i) => -4 + (i * 8) / (GRID - 1));

// Warm up
for (let i = 0; i < WARMUP; i++) {
  const kde = gaussianKDE(data);
  kde.evaluate(grid);
  kde.integrate(-1, 1);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  const kde = gaussianKDE(data);
  kde.evaluate(grid);
  kde.integrate(-1, 1);
  kde.logPdf(0);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "kde",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
