/**
 * Benchmark: Gaussian KDE on 10k data points — evaluate, pdf, integrate
 */
import { gaussianKDE } from "../../src/index.js";

const N = 10_000;
const EVAL_POINTS = 200;
const WARMUP = 3;
const ITERATIONS = 20;

// Generate data from a bimodal distribution
const data: number[] = Array.from({ length: N }, (_, i) => {
  const t = i / N;
  return t < 0.5 ? Math.sin(i * 0.05) * 2 + 3 : Math.cos(i * 0.03) * 2 - 3;
});

const evalPoints: number[] = Array.from({ length: EVAL_POINTS }, (_, i) => -6 + i * 0.06);

const kde = gaussianKDE(data);

for (let i = 0; i < WARMUP; i++) {
  kde.evaluate(evalPoints);
  kde.integrate(-2, 2);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  kde.evaluate(evalPoints);
  kde.integrate(-2, 2);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "gaussian_kde",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
