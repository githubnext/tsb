/**
 * TabNet: Attentive Interpretable Tabular Learning.
 *
 * Implements the core building blocks of TabNet (Arik & Pfister, 2019):
 * feature transformer, attentive transformer, and the sequential step logic.
 *
 * @module
 */

/** Sparsemax activation: projects onto the probability simplex. */
export function sparsemax(logits: Float64Array): Float64Array {
  const n = logits.length;
  const sorted = Float64Array.from(logits).sort((a, b) => b - a);
  let cumSum = 0;
  let k = n;
  for (let i = 0; i < n; i++) {
    cumSum += sorted[i] ?? 0;
    const threshold = (cumSum - 1) / (i + 1);
    if ((sorted[i] ?? 0) <= threshold) {
      k = i;
      break;
    }
  }
  const threshold = (cumSum - (sorted[k] ?? 0) - 1) / Math.max(k, 1);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = Math.max((logits[i] ?? 0) - threshold, 0);
  }
  return out;
}

/** GLU (Gated Linear Unit): splits input and applies sigmoid gate. */
export function glu(x: Float64Array): Float64Array {
  const half = Math.floor(x.length / 2);
  const out = new Float64Array(half);
  for (let i = 0; i < half; i++) {
    const val = x[i] ?? 0;
    const gate = 1 / (1 + Math.exp(-(x[i + half] ?? 0)));
    out[i] = val * gate;
  }
  return out;
}

/** Batch normalization (inference mode, uses running stats). */
export interface BatchNormParams {
  mean: Float64Array;
  variance: Float64Array;
  gamma: Float64Array;
  beta: Float64Array;
  eps: number;
}

export function batchNormInfer(x: Float64Array, params: BatchNormParams): Float64Array {
  const out = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) {
    const xi = x[i] ?? 0;
    const mu = params.mean[i] ?? 0;
    const va = params.variance[i] ?? 1;
    const g = params.gamma[i] ?? 1;
    const b = params.beta[i] ?? 0;
    out[i] = g * ((xi - mu) / Math.sqrt(va + params.eps)) + b;
  }
  return out;
}

/** TabNet feature transformer (single step). */
export interface FeatureTransformerWeights {
  /** Shared layer weight matrix [hiddenDim x inputDim]. */
  sharedW: Float64Array;
  /** Step-specific layer weight [hiddenDim x hiddenDim]. */
  stepW: Float64Array;
  /** Batch norm params for shared layer output. */
  sharedBN: BatchNormParams;
  /** Batch norm params for step layer output. */
  stepBN: BatchNormParams;
  hiddenDim: number;
  inputDim: number;
}

function matVec(W: Float64Array, x: Float64Array, rows: number, cols: number): Float64Array {
  const out = new Float64Array(rows);
  for (let r = 0; r < rows; r++) {
    let sum = 0;
    for (let c = 0; c < cols; c++) {
      sum += (W[r * cols + c] ?? 0) * (x[c] ?? 0);
    }
    out[r] = sum;
  }
  return out;
}

export function featureTransformer(
  x: Float64Array,
  weights: FeatureTransformerWeights,
): Float64Array {
  const { hiddenDim, inputDim } = weights;
  // Shared FC + BN + GLU
  const sharedOut = matVec(weights.sharedW, x, hiddenDim, inputDim);
  const sharedBN = batchNormInfer(sharedOut, weights.sharedBN);
  const sharedGLU = glu(sharedBN);

  // Step FC + BN + GLU (uses sharedGLU as input)
  const stepOut = matVec(weights.stepW, sharedGLU, hiddenDim, Math.floor(hiddenDim / 2));
  const stepBN = batchNormInfer(stepOut, weights.stepBN);
  return glu(stepBN);
}

/** Attentive transformer (selects which features to focus on). */
export interface AttentiveTransformerWeights {
  /** Weight matrix [numFeatures x hiddenDim]. */
  W: Float64Array;
  /** Prior scale penalty (cumulative). */
  priorScales: Float64Array;
  numFeatures: number;
  hiddenDim: number;
}

export function attentiveTransformer(
  h: Float64Array,
  priorScales: Float64Array,
  weights: AttentiveTransformerWeights,
): Float64Array {
  const { numFeatures, hiddenDim } = weights;
  const raw = matVec(weights.W, h, numFeatures, hiddenDim);
  // Apply prior scale penalty
  const penalized = new Float64Array(numFeatures);
  for (let i = 0; i < numFeatures; i++) {
    penalized[i] = (raw[i] ?? 0) * (priorScales[i] ?? 1);
  }
  return sparsemax(penalized);
}

/** TabNet step output. */
export interface TabNetStepResult {
  /** Feature mask (attention weights). */
  mask: Float64Array;
  /** Transformed features for this step. */
  output: Float64Array;
  /** Updated prior scales. */
  priorScales: Float64Array;
}

/** Run one TabNet step given input features x and prior state. */
export function tabnetStep(
  x: Float64Array,
  h: Float64Array,
  priorScales: Float64Array,
  featureWeights: FeatureTransformerWeights,
  attentiveWeights: AttentiveTransformerWeights,
  gamma: number,
): TabNetStepResult {
  const mask = attentiveTransformer(h, priorScales, attentiveWeights);
  // Masked features
  const maskedX = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) {
    maskedX[i] = (x[i] ?? 0) * (mask[i] ?? 0);
  }
  const output = featureTransformer(maskedX, featureWeights);
  // Update prior scales
  const newPrior = new Float64Array(priorScales.length);
  for (let i = 0; i < priorScales.length; i++) {
    newPrior[i] = (priorScales[i] ?? 1) * (gamma - (mask[i] ?? 0));
  }
  return { mask, output, priorScales: newPrior };
}

/** Aggregate TabNet step outputs into final representation. */
export function aggregateSteps(stepOutputs: Float64Array[]): Float64Array {
  if (stepOutputs.length === 0) return new Float64Array(0);
  const dim = stepOutputs[0]?.length ?? 0;
  const agg = new Float64Array(dim);
  for (const out of stepOutputs) {
    for (let i = 0; i < dim; i++) {
      agg[i] += Math.max(out[i] ?? 0, 0); // ReLU + sum
    }
  }
  return agg;
}

/** Compute feature importance from masks across steps. */
export function featureImportance(masks: Float64Array[]): Float64Array {
  if (masks.length === 0) return new Float64Array(0);
  const n = masks[0]?.length ?? 0;
  const importance = new Float64Array(n);
  for (const mask of masks) {
    for (let i = 0; i < n; i++) {
      importance[i] += Math.abs(mask[i] ?? 0);
    }
  }
  // Normalize
  let total = 0;
  for (let i = 0; i < n; i++) total += importance[i] ?? 0;
  if (total > 0) {
    for (let i = 0; i < n; i++) importance[i] = (importance[i] ?? 0) / total;
  }
  return importance;
}
