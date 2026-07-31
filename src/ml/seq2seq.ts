/**
 * Seq2Seq (Sequence-to-Sequence) with Bahdanau attention.
 *
 * Implements the encoder-decoder architecture with additive attention
 * for tasks like machine translation, summarization, and transcription.
 * Uses simple RNN (Elman) cells as building blocks.
 *
 * @module
 */

/** Sigmoid activation. */
export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/** Tanh activation. */
export function tanh(x: number): number {
  return Math.tanh(x);
}

/** Simple RNN (Elman) cell: h_t = tanh(W_h * h_{t-1} + W_x * x_t + b). */
export interface RNNCellWeights {
  Wh: Float64Array; // [hiddenSize x hiddenSize]
  Wx: Float64Array; // [hiddenSize x inputSize]
  b: Float64Array; // [hiddenSize]
  hiddenSize: number;
  inputSize: number;
}

export function rnnCell(
  x: Float64Array,
  hPrev: Float64Array,
  weights: RNNCellWeights,
): Float64Array {
  const { hiddenSize, inputSize } = weights;
  const h = new Float64Array(hiddenSize);
  for (let i = 0; i < hiddenSize; i++) {
    let val = weights.b[i] ?? 0;
    for (let j = 0; j < hiddenSize; j++) {
      val += (weights.Wh[i * hiddenSize + j] ?? 0) * (hPrev[j] ?? 0);
    }
    for (let j = 0; j < inputSize; j++) {
      val += (weights.Wx[i * inputSize + j] ?? 0) * (x[j] ?? 0);
    }
    h[i] = tanh(val);
  }
  return h;
}

/** Encode a sequence. Returns all hidden states [seqLen x hiddenSize]. */
export function encode(
  inputs: Float64Array[],
  initialHidden: Float64Array,
  weights: RNNCellWeights,
): Float64Array[] {
  const states: Float64Array[] = [];
  let h = initialHidden;
  for (const x of inputs) {
    h = rnnCell(x, h, weights);
    states.push(h);
  }
  return states;
}

/** Bahdanau (additive) attention weights. */
export interface BahdanauWeights {
  Wa: Float64Array; // [alignDim x hiddenSize] for encoder states
  Ua: Float64Array; // [alignDim x hiddenSize] for decoder hidden
  va: Float64Array; // [alignDim]
  alignDim: number;
  hiddenSize: number;
}

/** Compute Bahdanau attention weights. */
export function bahdanauAttention(
  decoderHidden: Float64Array,
  encoderStates: Float64Array[],
  weights: BahdanauWeights,
): { context: Float64Array; alphas: Float64Array } {
  const { alignDim, hiddenSize } = weights;
  const seqLen = encoderStates.length;
  const scores = new Float64Array(seqLen);

  // Decoder contribution (constant for all encoder states)
  const decoderContrib = new Float64Array(alignDim);
  for (let k = 0; k < alignDim; k++) {
    let s = 0;
    for (let j = 0; j < hiddenSize; j++) {
      s += (weights.Ua[k * hiddenSize + j] ?? 0) * (decoderHidden[j] ?? 0);
    }
    decoderContrib[k] = s;
  }

  for (let t = 0; t < seqLen; t++) {
    const enc = encoderStates[t]!;
    let score = 0;
    for (let k = 0; k < alignDim; k++) {
      let encContrib = 0;
      for (let j = 0; j < hiddenSize; j++) {
        encContrib += (weights.Wa[k * hiddenSize + j] ?? 0) * (enc[j] ?? 0);
      }
      score += (weights.va[k] ?? 0) * tanh(encContrib + (decoderContrib[k] ?? 0));
    }
    scores[t] = score;
  }

  // Softmax
  let maxScore = -Infinity;
  for (let t = 0; t < seqLen; t++) maxScore = Math.max(maxScore, scores[t] ?? -Infinity);
  let sumExp = 0;
  const alphas = new Float64Array(seqLen);
  for (let t = 0; t < seqLen; t++) {
    alphas[t] = Math.exp((scores[t] ?? 0) - maxScore);
    sumExp += alphas[t] ?? 0;
  }
  for (let t = 0; t < seqLen; t++) alphas[t] = (alphas[t] ?? 0) / (sumExp || 1);

  // Context vector
  const context = new Float64Array(hiddenSize);
  for (let t = 0; t < seqLen; t++) {
    const enc = encoderStates[t]!;
    for (let j = 0; j < hiddenSize; j++) {
      context[j] += (alphas[t] ?? 0) * (enc[j] ?? 0);
    }
  }
  return { context, alphas };
}

/** Decoder step with attention. */
export interface DecoderWeights {
  rnn: RNNCellWeights;
  attention: BahdanauWeights;
  outputW: Float64Array; // [vocabSize x hiddenSize]
  outputB: Float64Array; // [vocabSize]
  vocabSize: number;
}

export interface DecoderStepResult {
  hidden: Float64Array;
  logits: Float64Array;
  attentionWeights: Float64Array;
}

export function decoderStep(
  inputEmbedding: Float64Array,
  prevHidden: Float64Array,
  encoderStates: Float64Array[],
  weights: DecoderWeights,
): DecoderStepResult {
  const { context, alphas } = bahdanauAttention(prevHidden, encoderStates, weights.attention);

  // Concatenate input embedding and context
  const rnnInput = new Float64Array(inputEmbedding.length + context.length);
  for (let i = 0; i < inputEmbedding.length; i++) rnnInput[i] = inputEmbedding[i] ?? 0;
  for (let i = 0; i < context.length; i++) rnnInput[inputEmbedding.length + i] = context[i] ?? 0;

  const hidden = rnnCell(rnnInput, prevHidden, weights.rnn);

  // Project to vocabulary
  const logits = new Float64Array(weights.vocabSize);
  for (let v = 0; v < weights.vocabSize; v++) {
    let sum = weights.outputB[v] ?? 0;
    for (let j = 0; j < hidden.length; j++) {
      sum += (weights.outputW[v * hidden.length + j] ?? 0) * (hidden[j] ?? 0);
    }
    logits[v] = sum;
  }

  return { hidden, logits, attentionWeights: alphas };
}

/** Greedy decode: pick argmax at each step. */
export function greedyDecode(
  encoderStates: Float64Array[],
  initialHidden: Float64Array,
  sosEmbedding: Float64Array,
  embeddingMatrix: Float64Array,
  weights: DecoderWeights,
  maxLen: number,
  eosTokenId: number,
): number[] {
  const result: number[] = [];
  let hidden = initialHidden;
  let currentEmb = sosEmbedding;

  for (let step = 0; step < maxLen; step++) {
    const { hidden: newH, logits } = decoderStep(currentEmb, hidden, encoderStates, weights);
    hidden = newH;
    let bestIdx = 0;
    let bestScore = -Infinity;
    for (let v = 0; v < logits.length; v++) {
      if ((logits[v] ?? -Infinity) > bestScore) {
        bestScore = logits[v] ?? -Infinity;
        bestIdx = v;
      }
    }
    result.push(bestIdx);
    if (bestIdx === eosTokenId) break;
    // Get next embedding
    const dEmb = weights.rnn.inputSize - weights.attention.hiddenSize;
    currentEmb = new Float64Array(dEmb);
    for (let i = 0; i < dEmb; i++) {
      currentEmb[i] = embeddingMatrix[bestIdx * dEmb + i] ?? 0;
    }
  }
  return result;
}
