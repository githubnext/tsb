/**
 * Feature Tokenizer + Transformer (FT-Transformer) for tabular data.
 *
 * Implements the FT-Transformer architecture from Gorishniy et al. (2021):
 * numerical and categorical feature tokenization, multi-head self-attention,
 * feed-forward blocks, and a [CLS] token for classification/regression.
 *
 * @module
 */

/** Multi-head self-attention output. */
export interface AttentionOutput {
  /** Context vectors [seqLen x dModel]. */
  context: Float64Array;
  /** Attention weights [numHeads x seqLen x seqLen]. */
  weights: Float64Array;
}

/** Scaled dot-product attention for a single head. */
export function scaledDotProductAttention(
  Q: Float64Array,
  K: Float64Array,
  V: Float64Array,
  seqLen: number,
  dHead: number,
): { context: Float64Array; weights: Float64Array } {
  const scale = Math.sqrt(dHead);
  // Scores [seqLen x seqLen]
  const scores = new Float64Array(seqLen * seqLen);
  for (let i = 0; i < seqLen; i++) {
    for (let j = 0; j < seqLen; j++) {
      let dot = 0;
      for (let d = 0; d < dHead; d++) {
        dot += (Q[i * dHead + d] ?? 0) * (K[j * dHead + d] ?? 0);
      }
      scores[i * seqLen + j] = dot / scale;
    }
  }
  // Softmax over rows
  const weights = new Float64Array(seqLen * seqLen);
  for (let i = 0; i < seqLen; i++) {
    let maxScore = -Infinity;
    for (let j = 0; j < seqLen; j++) maxScore = Math.max(maxScore, scores[i * seqLen + j] ?? 0);
    let sumExp = 0;
    for (let j = 0; j < seqLen; j++) {
      const e = Math.exp((scores[i * seqLen + j] ?? 0) - maxScore);
      weights[i * seqLen + j] = e;
      sumExp += e;
    }
    for (let j = 0; j < seqLen; j++) {
      weights[i * seqLen + j] = (weights[i * seqLen + j] ?? 0) / (sumExp || 1);
    }
  }
  // Context [seqLen x dHead]
  const context = new Float64Array(seqLen * dHead);
  for (let i = 0; i < seqLen; i++) {
    for (let d = 0; d < dHead; d++) {
      let val = 0;
      for (let j = 0; j < seqLen; j++) {
        val += (weights[i * seqLen + j] ?? 0) * (V[j * dHead + d] ?? 0);
      }
      context[i * dHead + d] = val;
    }
  }
  return { context, weights };
}

/** Layer normalization. */
export function layerNorm(
  x: Float64Array,
  gamma: Float64Array,
  beta: Float64Array,
  eps: number = 1e-5,
): Float64Array {
  let mean = 0;
  for (let i = 0; i < x.length; i++) mean += x[i] ?? 0;
  mean /= x.length;
  let variance = 0;
  for (let i = 0; i < x.length; i++) {
    const d = (x[i] ?? 0) - mean;
    variance += d * d;
  }
  variance /= x.length;
  const std = Math.sqrt(variance + eps);
  const out = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) {
    out[i] = ((x[i] ?? 0) - mean) / std * (gamma[i] ?? 1) + (beta[i] ?? 0);
  }
  return out;
}

/** GELU activation (approximate). */
export function gelu(x: number): number {
  return 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x * x * x)));
}

/** Feed-forward block: Linear -> GELU -> Linear. */
export function feedForward(
  x: Float64Array,
  W1: Float64Array,
  b1: Float64Array,
  W2: Float64Array,
  b2: Float64Array,
  dModel: number,
  dFF: number,
): Float64Array {
  // First layer
  const h = new Float64Array(dFF);
  for (let j = 0; j < dFF; j++) {
    let sum = b1[j] ?? 0;
    for (let i = 0; i < dModel; i++) {
      sum += (W1[j * dModel + i] ?? 0) * (x[i] ?? 0);
    }
    h[j] = gelu(sum);
  }
  // Second layer
  const out = new Float64Array(dModel);
  for (let i = 0; i < dModel; i++) {
    let sum = b2[i] ?? 0;
    for (let j = 0; j < dFF; j++) {
      sum += (W2[i * dFF + j] ?? 0) * (h[j] ?? 0);
    }
    out[i] = sum;
  }
  return out;
}

/** Tokenize a numerical feature: embed to dModel dimensions. */
export function tokenizeNumerical(
  value: number,
  embedding: Float64Array,
  bias: Float64Array,
): Float64Array {
  const out = new Float64Array(embedding.length);
  for (let i = 0; i < embedding.length; i++) {
    out[i] = value * (embedding[i] ?? 0) + (bias[i] ?? 0);
  }
  return out;
}

/** Tokenize a categorical feature via embedding lookup. */
export function tokenizeCategorical(
  categoryIndex: number,
  embeddingMatrix: Float64Array,
  numCategories: number,
  dModel: number,
): Float64Array {
  const idx = Math.max(0, Math.min(categoryIndex, numCategories - 1));
  const out = new Float64Array(dModel);
  for (let i = 0; i < dModel; i++) {
    out[i] = embeddingMatrix[idx * dModel + i] ?? 0;
  }
  return out;
}

/** Add residual connection. */
export function addResidual(x: Float64Array, residual: Float64Array): Float64Array {
  const out = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) {
    out[i] = (x[i] ?? 0) + (residual[i] ?? 0);
  }
  return out;
}

/** Extract [CLS] token representation (first token). */
export function extractCLSToken(tokens: Float64Array, dModel: number): Float64Array {
  const cls = new Float64Array(dModel);
  for (let i = 0; i < dModel; i++) {
    cls[i] = tokens[i] ?? 0;
  }
  return cls;
}

/** Simple linear classifier head. */
export function linearHead(
  x: Float64Array,
  W: Float64Array,
  b: Float64Array,
  numClasses: number,
  dModel: number,
): Float64Array {
  const logits = new Float64Array(numClasses);
  for (let c = 0; c < numClasses; c++) {
    let sum = b[c] ?? 0;
    for (let i = 0; i < dModel; i++) {
      sum += (W[c * dModel + i] ?? 0) * (x[i] ?? 0);
    }
    logits[c] = sum;
  }
  return logits;
}

/** Softmax activation. */
export function softmax(logits: Float64Array): Float64Array {
  let maxVal = -Infinity;
  for (let i = 0; i < logits.length; i++) maxVal = Math.max(maxVal, logits[i] ?? 0);
  let sumExp = 0;
  const out = new Float64Array(logits.length);
  for (let i = 0; i < logits.length; i++) {
    out[i] = Math.exp((logits[i] ?? 0) - maxVal);
    sumExp += out[i] ?? 0;
  }
  for (let i = 0; i < out.length; i++) out[i] = (out[i] ?? 0) / (sumExp || 1);
  return out;
}
