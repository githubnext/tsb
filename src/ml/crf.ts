/**
 * Conditional Random Field (CRF) for sequence labeling.
 *
 * Implements a linear-chain CRF with the Viterbi algorithm for decoding,
 * the forward algorithm for computing partition functions, and
 * log-likelihood computation for training.
 *
 * @module
 */

/** CRF model parameters. */
export interface CRFParams {
  /** Emission scores [seqLen x numTags]. */
  emissionScores: Float64Array;
  /** Transition scores [numTags x numTags] (from -> to). */
  transitionScores: Float64Array;
  /** Start transition scores [numTags]. */
  startScores: Float64Array;
  /** End transition scores [numTags]. */
  endScores: Float64Array;
  numTags: number;
  seqLen: number;
}

/** Viterbi decoding result. */
export interface ViterbiResult {
  /** Best tag sequence. */
  tags: number[];
  /** Score of the best sequence. */
  score: number;
}

/** Viterbi algorithm for CRF decoding. */
export function viterbiDecode(params: CRFParams): ViterbiResult {
  const { numTags, seqLen, emissionScores, transitionScores, startScores, endScores } = params;

  // viterbi[t][tag] = best score ending at (t, tag)
  const viterbi: Float64Array[] = [];
  const backpointer: Int32Array[] = [];

  // Init: t=0
  const v0 = new Float64Array(numTags);
  const bp0 = new Int32Array(numTags).fill(-1);
  for (let j = 0; j < numTags; j++) {
    v0[j] = (startScores[j] ?? -Infinity) + (emissionScores[j] ?? -Infinity);
  }
  viterbi.push(v0);
  backpointer.push(bp0);

  for (let t = 1; t < seqLen; t++) {
    const vt = new Float64Array(numTags);
    const bpt = new Int32Array(numTags);
    const vprev = viterbi[t - 1]!;
    for (let j = 0; j < numTags; j++) {
      let bestScore = -Infinity;
      let bestPrev = 0;
      for (let i = 0; i < numTags; i++) {
        const score = (vprev[i] ?? -Infinity) + (transitionScores[i * numTags + j] ?? -Infinity);
        if (score > bestScore) {
          bestScore = score;
          bestPrev = i;
        }
      }
      vt[j] = bestScore + (emissionScores[t * numTags + j] ?? -Infinity);
      bpt[j] = bestPrev;
    }
    viterbi.push(vt);
    backpointer.push(bpt);
  }

  // Add end scores
  const vlast = viterbi[seqLen - 1]!;
  let bestFinalScore = -Infinity;
  let bestFinalTag = 0;
  for (let j = 0; j < numTags; j++) {
    const s = (vlast[j] ?? -Infinity) + (endScores[j] ?? 0);
    if (s > bestFinalScore) {
      bestFinalScore = s;
      bestFinalTag = j;
    }
  }

  // Backtrack
  const tags = new Array<number>(seqLen);
  tags[seqLen - 1] = bestFinalTag;
  for (let t = seqLen - 1; t > 0; t--) {
    tags[t - 1] = backpointer[t]![tags[t]!] ?? 0;
  }

  return { tags, score: bestFinalScore };
}

/** Forward algorithm: compute log partition function log Z. */
export function forwardLogZ(params: CRFParams): number {
  const { numTags, seqLen, emissionScores, transitionScores, startScores, endScores } = params;

  // alpha[tag] = log sum of scores for all paths ending at (t, tag)
  let alpha = new Float64Array(numTags);
  for (let j = 0; j < numTags; j++) {
    alpha[j] = (startScores[j] ?? -Infinity) + (emissionScores[j] ?? -Infinity);
  }

  for (let t = 1; t < seqLen; t++) {
    const newAlpha = new Float64Array(numTags);
    for (let j = 0; j < numTags; j++) {
      const scores = new Float64Array(numTags);
      for (let i = 0; i < numTags; i++) {
        scores[i] = (alpha[i] ?? -Infinity) + (transitionScores[i * numTags + j] ?? -Infinity);
      }
      newAlpha[j] = logSumExp(scores) + (emissionScores[t * numTags + j] ?? -Infinity);
    }
    alpha = newAlpha;
  }

  // Add end scores
  const final = new Float64Array(numTags);
  for (let j = 0; j < numTags; j++) {
    final[j] = (alpha[j] ?? -Infinity) + (endScores[j] ?? 0);
  }
  return logSumExp(final);
}

/** Compute score of a given tag sequence. */
export function sequenceScore(params: CRFParams, tags: number[]): number {
  const { numTags, emissionScores, transitionScores, startScores, endScores } = params;
  let score = startScores[tags[0] ?? 0] ?? -Infinity;
  score += emissionScores[(tags[0] ?? 0)] ?? -Infinity;
  for (let t = 1; t < tags.length; t++) {
    const prev = tags[t - 1] ?? 0;
    const curr = tags[t] ?? 0;
    score += transitionScores[prev * numTags + curr] ?? -Infinity;
    score += emissionScores[t * numTags + curr] ?? -Infinity;
  }
  score += endScores[tags[tags.length - 1] ?? 0] ?? 0;
  return score;
}

/** CRF negative log-likelihood for a given tag sequence. */
export function crfNegLogLikelihood(params: CRFParams, tags: number[]): number {
  const goldScore = sequenceScore(params, tags);
  const logZ = forwardLogZ(params);
  return logZ - goldScore;
}

/** Log-sum-exp (numerically stable). */
export function logSumExp(values: Float64Array): number {
  let max = -Infinity;
  for (let i = 0; i < values.length; i++) max = Math.max(max, values[i] ?? -Infinity);
  if (!isFinite(max)) return -Infinity;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += Math.exp((values[i] ?? -Infinity) - max);
  }
  return max + Math.log(sum);
}
