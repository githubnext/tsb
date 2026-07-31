/**
 * Bayesian Optimization with Gaussian Process surrogate and acquisition functions.
 *
 * Implements Expected Improvement (EI), Probability of Improvement (PI),
 * Upper Confidence Bound (UCB), and Thompson Sampling acquisition functions,
 * with an RBF kernel Gaussian Process as the surrogate model.
 *
 * @module
 */

/** RBF (squared exponential) kernel. */
export function rbfKernel(
  x1: Float64Array,
  x2: Float64Array,
  lengthScale: number,
  amplitude: number,
): number {
  let sqDist = 0;
  for (let i = 0; i < x1.length; i++) {
    const d = (x1[i] ?? 0) - (x2[i] ?? 0);
    sqDist += d * d;
  }
  return amplitude * amplitude * Math.exp(-0.5 * sqDist / (lengthScale * lengthScale));
}

/** Matern 5/2 kernel. */
export function maternKernel52(
  x1: Float64Array,
  x2: Float64Array,
  lengthScale: number,
  amplitude: number,
): number {
  let sqDist = 0;
  for (let i = 0; i < x1.length; i++) {
    const d = (x1[i] ?? 0) - (x2[i] ?? 0);
    sqDist += d * d;
  }
  const r = Math.sqrt(sqDist) / lengthScale;
  const sqrt5r = Math.sqrt(5) * r;
  return amplitude * amplitude * (1 + sqrt5r + (5 / 3) * r * r) * Math.exp(-sqrt5r);
}

/** Compute kernel matrix K(X, X) + noise * I. */
export function kernelMatrix(
  X: Float64Array[],
  lengthScale: number,
  amplitude: number,
  noise: number,
): Float64Array {
  const n = X.length;
  const K = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const k = rbfKernel(X[i]!, X[j]!, lengthScale, amplitude);
      K[i * n + j] = k;
      K[j * n + i] = k;
    }
    K[i * n + i] += noise;
  }
  return K;
}

/** Cholesky decomposition (lower triangular L such that L L^T = A). */
export function cholesky(A: Float64Array, n: number): Float64Array {
  const L = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = A[i * n + j] ?? 0;
      for (let k = 0; k < j; k++) {
        sum -= (L[i * n + k] ?? 0) * (L[j * n + k] ?? 0);
      }
      if (i === j) {
        L[i * n + j] = Math.sqrt(Math.max(sum, 1e-12));
      } else {
        L[i * n + j] = sum / ((L[j * n + j] ?? 1e-12) || 1e-12);
      }
    }
  }
  return L;
}

/** Solve L x = b (forward substitution). */
function forwardSolve(L: Float64Array, b: Float64Array, n: number): Float64Array {
  const x = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let sum = b[i] ?? 0;
    for (let j = 0; j < i; j++) sum -= (L[i * n + j] ?? 0) * (x[j] ?? 0);
    x[i] = sum / ((L[i * n + i] ?? 1) || 1);
  }
  return x;
}

/** Solve L^T x = b (backward substitution). */
function backwardSolve(L: Float64Array, b: Float64Array, n: number): Float64Array {
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let sum = b[i] ?? 0;
    for (let j = i + 1; j < n; j++) sum -= (L[j * n + i] ?? 0) * (x[j] ?? 0);
    x[i] = sum / ((L[i * n + i] ?? 1) || 1);
  }
  return x;
}

/** Gaussian Process prediction: return (mean, variance) at test point. */
export function gpPredict(
  xTest: Float64Array,
  X: Float64Array[],
  y: Float64Array,
  L: Float64Array,
  lengthScale: number,
  amplitude: number,
  noise: number,
): { mean: number; variance: number } {
  const n = X.length;
  // k_* = [k(x*, x_i)]
  const kStar = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    kStar[i] = rbfKernel(xTest, X[i]!, lengthScale, amplitude);
  }
  // alpha = (K + noise*I)^{-1} y  via Cholesky
  const alpha1 = forwardSolve(L, y, n);
  const alpha = backwardSolve(L, alpha1, n);

  // mean = k_*^T alpha
  let mean = 0;
  for (let i = 0; i < n; i++) mean += (kStar[i] ?? 0) * (alpha[i] ?? 0);

  // variance = k(x*,x*) - k_*^T (K+noise*I)^{-1} k_*
  const v = forwardSolve(L, kStar, n);
  let kStarDotV = 0;
  for (let i = 0; i < n; i++) kStarDotV += (v[i] ?? 0) * (v[i] ?? 0);
  const kSelf = rbfKernel(xTest, xTest, lengthScale, amplitude) + noise;
  const variance = Math.max(kSelf - kStarDotV, 1e-10);

  return { mean, variance };
}

/** Standard normal CDF (approximation). */
export function normalCDF(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const phi = 1 - (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * z * z) * poly;
  return z >= 0 ? phi : 1 - phi;
}

/** Standard normal PDF. */
export function normalPDF(z: number): number {
  return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * z * z);
}

/** Expected Improvement acquisition function. */
export function expectedImprovement(
  mean: number,
  variance: number,
  bestY: number,
  xi: number = 0.01,
): number {
  const std = Math.sqrt(variance);
  const z = (mean - bestY - xi) / (std || 1e-8);
  return (mean - bestY - xi) * normalCDF(z) + std * normalPDF(z);
}

/** Probability of Improvement acquisition function. */
export function probabilityOfImprovement(
  mean: number,
  variance: number,
  bestY: number,
  xi: number = 0.01,
): number {
  const std = Math.sqrt(variance);
  return normalCDF((mean - bestY - xi) / (std || 1e-8));
}

/** Upper Confidence Bound acquisition function. */
export function upperConfidenceBound(mean: number, variance: number, kappa: number = 2.0): number {
  return mean + kappa * Math.sqrt(variance);
}

/** Bayesian optimization state. */
export interface BOState {
  observedX: Float64Array[];
  observedY: Float64Array;
  bestY: number;
  bestX: Float64Array;
  lengthScale: number;
  amplitude: number;
  noise: number;
}

/** Initialize Bayesian optimization state from initial observations. */
export function initBOState(
  X: Float64Array[],
  y: Float64Array,
  lengthScale: number = 1.0,
  amplitude: number = 1.0,
  noise: number = 0.01,
): BOState {
  let bestIdx = 0;
  for (let i = 1; i < y.length; i++) {
    if ((y[i] ?? -Infinity) > (y[bestIdx] ?? -Infinity)) bestIdx = i;
  }
  return {
    observedX: X,
    observedY: y,
    bestY: y[bestIdx] ?? -Infinity,
    bestX: X[bestIdx] ?? new Float64Array(0),
    lengthScale,
    amplitude,
    noise,
  };
}

/** Suggest the next candidate by maximizing EI over provided candidates. */
export function suggestNext(
  state: BOState,
  candidates: Float64Array[],
  acquisition: "EI" | "PI" | "UCB" = "EI",
  kappa: number = 2.0,
  xi: number = 0.01,
): { bestCandidate: Float64Array; acquisitionValues: Float64Array } {
  const K = kernelMatrix(state.observedX, state.lengthScale, state.amplitude, state.noise);
  const L = cholesky(K, state.observedX.length);

  const acqValues = new Float64Array(candidates.length);
  for (let i = 0; i < candidates.length; i++) {
    const { mean, variance } = gpPredict(
      candidates[i]!,
      state.observedX,
      state.observedY,
      L,
      state.lengthScale,
      state.amplitude,
      state.noise,
    );
    if (acquisition === "EI") {
      acqValues[i] = expectedImprovement(mean, variance, state.bestY, xi);
    } else if (acquisition === "PI") {
      acqValues[i] = probabilityOfImprovement(mean, variance, state.bestY, xi);
    } else {
      acqValues[i] = upperConfidenceBound(mean, variance, kappa);
    }
  }

  let bestIdx = 0;
  for (let i = 1; i < acqValues.length; i++) {
    if ((acqValues[i] ?? -Infinity) > (acqValues[bestIdx] ?? -Infinity)) bestIdx = i;
  }
  return { bestCandidate: candidates[bestIdx] ?? new Float64Array(0), acquisitionValues: acqValues };
}
