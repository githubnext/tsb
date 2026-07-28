/**
 * Benchmark: polyval — evaluate a polynomial with given coefficients.
 * Dataset: degree-5 polynomial evaluated at 100,000 points, 50 iterations.
 */
import { polyval } from "../../src/index.js";

const N = 100_000;
const WARMUP = 5;
const ITERATIONS = 50;

// Degree-5 polynomial coefficients [a5, a4, a3, a2, a1, a0]
const coefs = [1.5, -2.3, 0.7, 4.1, -0.9, 3.0];
const xs = Array.from({ length: N }, (_, i) => (i / N) * 10 - 5);

for (let i = 0; i < WARMUP; i++) {
  polyval(coefs, xs);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  polyval(coefs, xs);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "polyval",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
