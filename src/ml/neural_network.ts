/**
 * Neural Network layers and training utilities from scratch.
 *
 * Implements dense layers, activations, loss functions, and
 * mini-batch SGD/Adam optimizer for feed-forward networks.
 *
 * @module
 */

/** Dense layer forward pass: y = W x + b. */
export function denseForward(
  x: Float64Array,
  W: Float64Array,
  b: Float64Array,
  outDim: number,
  inDim: number,
): Float64Array {
  const y = new Float64Array(outDim);
  for (let i = 0; i < outDim; i++) {
    let sum = b[i] ?? 0;
    for (let j = 0; j < inDim; j++) {
      sum += (W[i * inDim + j] ?? 0) * (x[j] ?? 0);
    }
    y[i] = sum;
  }
  return y;
}

/** Dense layer backward pass: returns dL/dx, dL/dW, dL/db. */
export function denseBackward(
  x: Float64Array,
  W: Float64Array,
  dOut: Float64Array,
  outDim: number,
  inDim: number,
): { dX: Float64Array; dW: Float64Array; dB: Float64Array } {
  const dX = new Float64Array(inDim);
  const dW = new Float64Array(outDim * inDim);
  const dB = new Float64Array(outDim);

  for (let i = 0; i < outDim; i++) {
    dB[i] = dOut[i] ?? 0;
    for (let j = 0; j < inDim; j++) {
      dW[i * inDim + j] = (dOut[i] ?? 0) * (x[j] ?? 0);
      dX[j] = (dX[j] ?? 0) + (dOut[i] ?? 0) * (W[i * inDim + j] ?? 0);
    }
  }
  return { dX, dW, dB };
}

/** ReLU activation and its gradient. */
export function relu(x: Float64Array): Float64Array {
  const out = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = Math.max(0, x[i] ?? 0);
  return out;
}

export function reluGrad(x: Float64Array, dOut: Float64Array): Float64Array {
  const dX = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) dX[i] = (x[i] ?? 0) > 0 ? (dOut[i] ?? 0) : 0;
  return dX;
}

/** Sigmoid activation and its gradient. */
export function sigmoidActivation(x: Float64Array): Float64Array {
  const out = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = 1 / (1 + Math.exp(-(x[i] ?? 0)));
  return out;
}

export function sigmoidGrad(out: Float64Array, dOut: Float64Array): Float64Array {
  const dX = new Float64Array(out.length);
  for (let i = 0; i < out.length; i++) {
    const s = out[i] ?? 0;
    dX[i] = s * (1 - s) * (dOut[i] ?? 0);
  }
  return dX;
}

/** Softmax and cross-entropy loss (combined for numerical stability). */
export function softmaxCrossEntropy(
  logits: Float64Array,
  labels: Float64Array,
): { loss: number; dLogits: Float64Array } {
  const n = logits.length;
  let maxLogit = -Infinity;
  for (let i = 0; i < n; i++) maxLogit = Math.max(maxLogit, logits[i] ?? -Infinity);

  let sumExp = 0;
  const probs = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    probs[i] = Math.exp((logits[i] ?? 0) - maxLogit);
    sumExp += probs[i] ?? 0;
  }
  let loss = 0;
  for (let i = 0; i < n; i++) {
    probs[i] = (probs[i] ?? 0) / (sumExp || 1);
    const label = labels[i] ?? 0;
    if (label > 0) loss -= label * Math.log(Math.max(probs[i] ?? 0, 1e-12));
  }

  const dLogits = new Float64Array(n);
  for (let i = 0; i < n; i++) dLogits[i] = (probs[i] ?? 0) - (labels[i] ?? 0);
  return { loss, dLogits };
}

/** MSE loss and gradient. */
export function mseLoss(
  pred: Float64Array,
  target: Float64Array,
): { loss: number; dPred: Float64Array } {
  const dPred = new Float64Array(pred.length);
  let loss = 0;
  for (let i = 0; i < pred.length; i++) {
    const d = (pred[i] ?? 0) - (target[i] ?? 0);
    loss += d * d;
    dPred[i] = 2 * d / pred.length;
  }
  return { loss: loss / pred.length, dPred };
}

/** Adam optimizer state. */
export interface AdamState {
  m: Float64Array;
  v: Float64Array;
  t: number;
  lr: number;
  beta1: number;
  beta2: number;
  eps: number;
}

/** Initialize Adam optimizer state for a parameter vector. */
export function initAdam(
  paramSize: number,
  lr: number = 1e-3,
  beta1: number = 0.9,
  beta2: number = 0.999,
  eps: number = 1e-8,
): AdamState {
  return { m: new Float64Array(paramSize), v: new Float64Array(paramSize), t: 0, lr, beta1, beta2, eps };
}

/** Adam update step: modifies params in-place, returns updated AdamState. */
export function adamStep(
  params: Float64Array,
  grads: Float64Array,
  state: AdamState,
): AdamState {
  const { lr, beta1, beta2, eps } = state;
  const t = state.t + 1;
  const m = new Float64Array(params.length);
  const v = new Float64Array(params.length);

  for (let i = 0; i < params.length; i++) {
    const g = grads[i] ?? 0;
    m[i] = beta1 * (state.m[i] ?? 0) + (1 - beta1) * g;
    v[i] = beta2 * (state.v[i] ?? 0) + (1 - beta2) * g * g;
    const mHat = (m[i] ?? 0) / (1 - Math.pow(beta1, t));
    const vHat = (v[i] ?? 0) / (1 - Math.pow(beta2, t));
    params[i] = (params[i] ?? 0) - lr * mHat / (Math.sqrt(vHat) + eps);
  }

  return { ...state, m, v, t };
}

/** He initialization for ReLU networks. */
export function heInit(inDim: number, outDim: number, rngSeed: number = 42): Float64Array {
  const weights = new Float64Array(outDim * inDim);
  let state = rngSeed >>> 0;
  const std = Math.sqrt(2 / inDim);
  for (let i = 0; i < weights.length; i++) {
    // Box-Muller transform for Gaussian noise
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    const u1 = (state / 4294967296) || 1e-10;
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    const u2 = state / 4294967296;
    weights[i] = std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
  return weights;
}

/** Dropout mask (for training). */
export function dropoutMask(size: number, rate: number, rngSeed: number): Float64Array {
  const mask = new Float64Array(size);
  let state = rngSeed >>> 0;
  const scale = 1 / (1 - rate);
  for (let i = 0; i < size; i++) {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    mask[i] = state / 4294967296 > rate ? scale : 0;
  }
  return mask;
}

/** Apply dropout mask to activations. */
export function applyDropout(x: Float64Array, mask: Float64Array): Float64Array {
  const out = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = (x[i] ?? 0) * (mask[i] ?? 0);
  return out;
}
