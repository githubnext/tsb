/**
 * Benchmark: multivariate statistics — mahalanobis distance, covMatrix, PCA
 * Dataset: 500 observations × 5 features (realistic small-to-medium size)
 */
import { mahalanobis, covMatrix, PCA } from "../../src/index.js";

const N = 500;
const P = 5;
const WARMUP = 3;
const ITERATIONS = 20;

// Generate a deterministic dataset
const X: number[][] = Array.from({ length: N }, (_, i) =>
  Array.from({ length: P }, (_, j) => Math.sin(i * 0.1 + j) * 10 + j * 2),
);

const u = X[0]!;
const v = X[1]!;

// Pre-compute inverse covariance for mahalanobis
const cov = covMatrix(X);
// Simple diagonal approximation for VI (invertMatrix is tested via mahalanobis internals)
const VI: number[][] = Array.from({ length: P }, (_, i) =>
  Array.from({ length: P }, (_, j) => (i === j ? 1 / Math.max(cov[i]![i]!, 1e-10) : 0)),
);

// Warm up
for (let i = 0; i < WARMUP; i++) {
  mahalanobis(u, v, VI);
  covMatrix(X);
  new PCA({ n_components: 3 }).fit(X);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  mahalanobis(u, v, VI);
  covMatrix(X);
  new PCA({ n_components: 3 }).fit(X);
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "multivariate",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
