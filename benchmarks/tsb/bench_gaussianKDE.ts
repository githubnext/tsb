/**
 * Benchmark: Gaussian KDE evaluate on 1000-point dataset at 200 grid points.
 * Uses Silverman bandwidth (default).
 */
import { gaussianKDE } from "../../src/index.js";

const N = 1_000;
const GRID = 200;
const WARMUP = 3;
const ITERATIONS = 20;

// Create dataset: mix of two gaussians
const data: number[] = [];
for (let i = 0; i < N; i++) {
  const x = Math.sin(i * 0.01) * 2 + (i % 2 === 0 ? 0 : 5);
  data.push(x);
}

// Grid points to evaluate KDE at
const xmin = -5;
const xmax = 10;
const grid: number[] = Array.from({ length: GRID }, (_, i) => xmin + (i / (GRID - 1)) * (xmax - xmin));

// Warm-up
for (let i = 0; i < WARMUP; i++) {
  const kde = gaussianKDE(data);
  kde.evaluate(grid);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  const kde = gaussianKDE(data);
  kde.evaluate(grid);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "gaussianKDE",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
