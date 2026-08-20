/**
 * Support Vector Machine (SVM) with SMO algorithm.
 *
 * Implements binary SVM classification with:
 * - Linear, polynomial, and RBF kernels
 * - Sequential Minimal Optimization (SMO) training
 * - Support vector regression (SVR) epsilon-insensitive loss
 *
 * @module
 */

/** Kernel function type. */
export type KernelType = "linear" | "poly" | "rbf";

/** SVM kernel configuration. */
export interface SVMKernelConfig {
  type: KernelType;
  /** Gamma for RBF and polynomial kernels. */
  gamma: number;
  /** Degree for polynomial kernel. */
  degree: number;
  /** Coef0 for polynomial kernel. */
  coef0: number;
}

/** Compute kernel between two vectors. */
export function computeKernel(
  x1: Float64Array,
  x2: Float64Array,
  config: SVMKernelConfig,
): number {
  if (config.type === "linear") {
    let dot = 0;
    for (let i = 0; i < x1.length; i++) dot += (x1[i] ?? 0) * (x2[i] ?? 0);
    return dot;
  } else if (config.type === "rbf") {
    let sqDist = 0;
    for (let i = 0; i < x1.length; i++) {
      const d = (x1[i] ?? 0) - (x2[i] ?? 0);
      sqDist += d * d;
    }
    return Math.exp(-config.gamma * sqDist);
  } else {
    // Polynomial
    let dot = 0;
    for (let i = 0; i < x1.length; i++) dot += (x1[i] ?? 0) * (x2[i] ?? 0);
    return (config.gamma * dot + config.coef0) ** config.degree;
  }
}

/** Trained SVM model. */
export interface SVMModel {
  /** Lagrange multipliers (support vector weights). */
  alphas: Float64Array;
  /** Training labels (-1 or +1). */
  labels: Float64Array;
  /** Training features. */
  supportVectors: Float64Array[];
  /** Bias term. */
  b: number;
  kernel: SVMKernelConfig;
}

/** Compute decision function value for a single sample. */
export function svmDecision(model: SVMModel, x: Float64Array): number {
  let sum = -model.b;
  for (let i = 0; i < model.supportVectors.length; i++) {
    const alpha = model.alphas[i] ?? 0;
    if (Math.abs(alpha) < 1e-8) continue;
    sum += alpha * (model.labels[i] ?? 0) * computeKernel(model.supportVectors[i]!, x, model.kernel);
  }
  return sum;
}

/** Predict class labels for an array of samples. */
export function svmPredict(model: SVMModel, X: Float64Array[]): Int8Array {
  const out = new Int8Array(X.length);
  for (let i = 0; i < X.length; i++) {
    out[i] = svmDecision(model, X[i]!) >= 0 ? 1 : -1;
  }
  return out;
}

/** SMO training algorithm for binary SVM. */
export function fitSVM(
  X: Float64Array[],
  y: Float64Array,
  C: number = 1.0,
  kernel: SVMKernelConfig = { type: "rbf", gamma: 0.1, degree: 3, coef0: 0 },
  maxIter: number = 200,
  tol: number = 1e-3,
): SVMModel {
  const n = X.length;
  const alphas = new Float64Array(n);
  let b = 0;

  // Precompute kernel matrix
  const K = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const k = computeKernel(X[i]!, X[j]!, kernel);
      K[i * n + j] = k;
      K[j * n + i] = k;
    }
  }

  for (let iter = 0; iter < maxIter; iter++) {
    let numChanged = 0;

    for (let i = 0; i < n; i++) {
      const yi = y[i] ?? 0;
      // Compute error
      let fi = -b;
      for (let k2 = 0; k2 < n; k2++) {
        fi += (alphas[k2] ?? 0) * (y[k2] ?? 0) * (K[k2 * n + i] ?? 0);
      }
      const ei = fi - yi;

      if (
        (yi * ei < -tol && (alphas[i] ?? 0) < C) ||
        (yi * ei > tol && (alphas[i] ?? 0) > 0)
      ) {
        // Heuristic: pick j != i with max |ei - ej|
        let j = (i + 1) % n;
        let maxDiff = 0;
        for (let k2 = 0; k2 < n; k2++) {
          if (k2 === i) continue;
          let fj = -b;
          for (let m = 0; m < n; m++) fj += (alphas[m] ?? 0) * (y[m] ?? 0) * (K[m * n + k2] ?? 0);
          const ej = fj - (y[k2] ?? 0);
          if (Math.abs(ei - ej) > maxDiff) {
            maxDiff = Math.abs(ei - ej);
            j = k2;
          }
        }

        const yj = y[j] ?? 0;
        let fj = -b;
        for (let k2 = 0; k2 < n; k2++) fj += (alphas[k2] ?? 0) * (y[k2] ?? 0) * (K[k2 * n + j] ?? 0);
        const ej = fj - yj;

        const oldAlphaI = alphas[i] ?? 0;
        const oldAlphaJ = alphas[j] ?? 0;

        let L: number, H: number;
        if (yi !== yj) {
          L = Math.max(0, oldAlphaJ - oldAlphaI);
          H = Math.min(C, C + oldAlphaJ - oldAlphaI);
        } else {
          L = Math.max(0, oldAlphaI + oldAlphaJ - C);
          H = Math.min(C, oldAlphaI + oldAlphaJ);
        }

        if (L >= H) continue;

        const eta = 2 * (K[i * n + j] ?? 0) - (K[i * n + i] ?? 0) - (K[j * n + j] ?? 0);
        if (eta >= 0) continue;

        let newAlphaJ = oldAlphaJ - yj * (ei - ej) / eta;
        newAlphaJ = Math.min(H, Math.max(L, newAlphaJ));

        if (Math.abs(newAlphaJ - oldAlphaJ) < 1e-5) continue;

        const newAlphaI = oldAlphaI + yi * yj * (oldAlphaJ - newAlphaJ);
        alphas[i] = newAlphaI;
        alphas[j] = newAlphaJ;

        const b1 = b + ei + yi * (newAlphaI - oldAlphaI) * (K[i * n + i] ?? 0) + yj * (newAlphaJ - oldAlphaJ) * (K[i * n + j] ?? 0);
        const b2 = b + ej + yi * (newAlphaI - oldAlphaI) * (K[i * n + j] ?? 0) + yj * (newAlphaJ - oldAlphaJ) * (K[j * n + j] ?? 0);

        if (newAlphaI > 0 && newAlphaI < C) {
          b = b1;
        } else if (newAlphaJ > 0 && newAlphaJ < C) {
          b = b2;
        } else {
          b = (b1 + b2) / 2;
        }

        numChanged++;
      }
    }

    if (numChanged === 0) break;
  }

  return { alphas, labels: y, supportVectors: X, b, kernel };
}

/** Compute classification accuracy. */
export function svmAccuracy(model: SVMModel, X: Float64Array[], y: Float64Array): number {
  const preds = svmPredict(model, X);
  let correct = 0;
  for (let i = 0; i < y.length; i++) {
    if ((preds[i] ?? 0) === (y[i] ?? 0)) correct++;
  }
  return correct / (y.length || 1);
}
