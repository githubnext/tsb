/**
 * Benchmark: PCA.fitTransform, PCA.transform, PCA.inverseTransform.
 *
 * Mirrors sklearn.decomposition.PCA (fit_transform, transform, inverse_transform).
 * Dataset: 1,000 observations × 10 features, reducing to 5 components.
 *
 * Outputs JSON: {"function": "pca_transform", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { PCA } from "../../src/index.js";

const N = 1_000;
const P = 10;
const N_COMPONENTS = 5;
const WARMUP = 5;
const ITERATIONS = 30;

// Deterministic dataset with correlated features
const X: number[][] = Array.from({ length: N }, (_, i) =>
  Array.from({ length: P }, (_, j) => Math.sin(i * 0.05 + j * 0.3) * 10 + j * 3),
);

const pca = new PCA({ n_components: N_COMPONENTS });

function run(): void {
  // fitTransform: fit + project in one call
  const scores = pca.fitTransform(X);
  // transform: project new data using already-fitted PCA
  const result = pca.getResult();
  result.transform(X);
  // inverseTransform: reconstruct original space from scores
  result.inverseTransform(scores);
}

for (let i = 0; i < WARMUP; i++) {
  run();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  run();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "pca_transform",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
