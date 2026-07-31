/**
 * Multi-head self-attention and transformer building blocks.
 *
 * Provides standalone attention primitives usable across architectures:
 * multi-head attention, positional encodings, and transformer encoder/decoder blocks.
 *
 * @module
 */

/** Multi-head attention configuration. */
export interface MHAConfig {
  dModel: number;
  numHeads: number;
  dropout: number;
}

/** Project a flat weight matrix into per-head slices. */
function splitHeads(
  x: Float64Array,
  seqLen: number,
  dModel: number,
  numHeads: number,
): Float64Array[] {
  const dHead = Math.floor(dModel / numHeads);
  const heads: Float64Array[] = [];
  for (let h = 0; h < numHeads; h++) {
    const head = new Float64Array(seqLen * dHead);
    for (let t = 0; t < seqLen; t++) {
      for (let d = 0; d < dHead; d++) {
        head[t * dHead + d] = x[t * dModel + h * dHead + d] ?? 0;
      }
    }
    heads.push(head);
  }
  return heads;
}

/** Concatenate per-head outputs back into [seqLen x dModel]. */
function mergeHeads(
  heads: Float64Array[],
  seqLen: number,
  dModel: number,
): Float64Array {
  const numHeads = heads.length;
  const dHead = Math.floor(dModel / numHeads);
  const out = new Float64Array(seqLen * dModel);
  for (let h = 0; h < numHeads; h++) {
    const head = heads[h]!;
    for (let t = 0; t < seqLen; t++) {
      for (let d = 0; d < dHead; d++) {
        out[t * dModel + h * dHead + d] = head[t * dHead + d] ?? 0;
      }
    }
  }
  return out;
}

/** Compute attention for a single head: [seqLen x dHead]. */
function singleHeadAttention(
  Q: Float64Array,
  K: Float64Array,
  V: Float64Array,
  seqLen: number,
  dHead: number,
  mask?: Float64Array,
): Float64Array {
  const scale = Math.sqrt(dHead);
  const attn = new Float64Array(seqLen * seqLen);
  // Q K^T / scale
  for (let i = 0; i < seqLen; i++) {
    for (let j = 0; j < seqLen; j++) {
      let dot = 0;
      for (let d = 0; d < dHead; d++) {
        dot += (Q[i * dHead + d] ?? 0) * (K[j * dHead + d] ?? 0);
      }
      attn[i * seqLen + j] = dot / scale + (mask ? (mask[i * seqLen + j] ?? 0) : 0);
    }
  }
  // Softmax
  for (let i = 0; i < seqLen; i++) {
    let maxVal = -Infinity;
    for (let j = 0; j < seqLen; j++) maxVal = Math.max(maxVal, attn[i * seqLen + j] ?? -Infinity);
    let sumExp = 0;
    for (let j = 0; j < seqLen; j++) {
      attn[i * seqLen + j] = Math.exp((attn[i * seqLen + j] ?? 0) - maxVal);
      sumExp += attn[i * seqLen + j] ?? 0;
    }
    for (let j = 0; j < seqLen; j++) attn[i * seqLen + j] = (attn[i * seqLen + j] ?? 0) / (sumExp || 1);
  }
  // A V
  const out = new Float64Array(seqLen * dHead);
  for (let i = 0; i < seqLen; i++) {
    for (let d = 0; d < dHead; d++) {
      let val = 0;
      for (let j = 0; j < seqLen; j++) {
        val += (attn[i * seqLen + j] ?? 0) * (V[j * dHead + d] ?? 0);
      }
      out[i * dHead + d] = val;
    }
  }
  return out;
}

/** Multi-head attention weight matrices. */
export interface MHAWeights {
  Wq: Float64Array; // [dModel x dModel]
  Wk: Float64Array; // [dModel x dModel]
  Wv: Float64Array; // [dModel x dModel]
  Wo: Float64Array; // [dModel x dModel]
  config: MHAConfig;
}

/** Apply multi-head attention. */
export function multiHeadAttention(
  query: Float64Array, // [seqLen x dModel]
  key: Float64Array, // [seqLen x dModel]
  value: Float64Array, // [seqLen x dModel]
  seqLen: number,
  weights: MHAWeights,
  mask?: Float64Array,
): Float64Array {
  const { dModel, numHeads } = weights.config;
  const dHead = Math.floor(dModel / numHeads);

  // Project Q, K, V
  const projQ = new Float64Array(seqLen * dModel);
  const projK = new Float64Array(seqLen * dModel);
  const projV = new Float64Array(seqLen * dModel);

  for (let t = 0; t < seqLen; t++) {
    for (let o = 0; o < dModel; o++) {
      let q = 0, k = 0, v = 0;
      for (let i = 0; i < dModel; i++) {
        q += (weights.Wq[o * dModel + i] ?? 0) * (query[t * dModel + i] ?? 0);
        k += (weights.Wk[o * dModel + i] ?? 0) * (key[t * dModel + i] ?? 0);
        v += (weights.Wv[o * dModel + i] ?? 0) * (value[t * dModel + i] ?? 0);
      }
      projQ[t * dModel + o] = q;
      projK[t * dModel + o] = k;
      projV[t * dModel + o] = v;
    }
  }

  // Split into heads and compute attention
  const qHeads = splitHeads(projQ, seqLen, dModel, numHeads);
  const kHeads = splitHeads(projK, seqLen, dModel, numHeads);
  const vHeads = splitHeads(projV, seqLen, dModel, numHeads);

  const headOutputs: Float64Array[] = [];
  for (let h = 0; h < numHeads; h++) {
    headOutputs.push(singleHeadAttention(qHeads[h]!, kHeads[h]!, vHeads[h]!, seqLen, dHead, mask));
  }

  const concat = mergeHeads(headOutputs, seqLen, dModel);

  // Output projection
  const out = new Float64Array(seqLen * dModel);
  for (let t = 0; t < seqLen; t++) {
    for (let o = 0; o < dModel; o++) {
      let val = 0;
      for (let i = 0; i < dModel; i++) {
        val += (weights.Wo[o * dModel + i] ?? 0) * (concat[t * dModel + i] ?? 0);
      }
      out[t * dModel + o] = val;
    }
  }
  return out;
}

/** Sinusoidal positional encoding. */
export function sinusoidalPositionalEncoding(seqLen: number, dModel: number): Float64Array {
  const pe = new Float64Array(seqLen * dModel);
  for (let pos = 0; pos < seqLen; pos++) {
    for (let i = 0; i < dModel; i += 2) {
      const angle = pos / Math.pow(10000, i / dModel);
      pe[pos * dModel + i] = Math.sin(angle);
      if (i + 1 < dModel) pe[pos * dModel + i + 1] = Math.cos(angle);
    }
  }
  return pe;
}

/** Add positional encoding to input embeddings. */
export function addPositionalEncoding(
  embeddings: Float64Array,
  seqLen: number,
  dModel: number,
): Float64Array {
  const pe = sinusoidalPositionalEncoding(seqLen, dModel);
  const out = new Float64Array(embeddings.length);
  for (let i = 0; i < embeddings.length; i++) {
    out[i] = (embeddings[i] ?? 0) + (pe[i] ?? 0);
  }
  return out;
}

/** Causal (autoregressive) attention mask. */
export function causalMask(seqLen: number): Float64Array {
  const mask = new Float64Array(seqLen * seqLen).fill(-Infinity);
  for (let i = 0; i < seqLen; i++) {
    for (let j = 0; j <= i; j++) {
      mask[i * seqLen + j] = 0;
    }
  }
  return mask;
}

/** RoPE (Rotary Position Embedding) for a single head. */
export function applyRoPE(
  x: Float64Array,
  seqLen: number,
  dHead: number,
  baseFreq: number = 10000,
): Float64Array {
  const out = new Float64Array(x.length);
  for (let pos = 0; pos < seqLen; pos++) {
    for (let i = 0; i < dHead; i += 2) {
      const theta = pos / Math.pow(baseFreq, i / dHead);
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      const x0 = x[pos * dHead + i] ?? 0;
      const x1 = x[pos * dHead + i + 1] ?? 0;
      out[pos * dHead + i] = x0 * cos - x1 * sin;
      out[pos * dHead + i + 1] = x0 * sin + x1 * cos;
    }
  }
  return out;
}
