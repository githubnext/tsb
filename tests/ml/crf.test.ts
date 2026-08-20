/**
 * Tests for src/ml/crf.ts
 */
import { describe, expect, it } from "bun:test";
import { viterbiDecode, forwardLogZ, sequenceScore, crfNegLogLikelihood, logSumExp } from "../../src/index.ts";
import type { CRFParams } from "../../src/index.ts";

function makeCRFParams(): CRFParams {
  const numTags = 3;
  const seqLen = 4;
  const emissionScores = new Float64Array([
    1, 0, 0,   // t=0: prefer tag 0
    0, 2, 0,   // t=1: prefer tag 1
    0, 0, 3,   // t=2: prefer tag 2
    1, 0, 0,   // t=3: prefer tag 0
  ]);
  const transitionScores = new Float64Array(numTags * numTags).fill(0);
  const startScores = new Float64Array([1, 0, 0]); // start with tag 0
  const endScores = new Float64Array(numTags).fill(0);
  return { emissionScores, transitionScores, startScores, endScores, numTags, seqLen };
}

describe("viterbiDecode", () => {
  it("returns correct tag sequence for simple emissions", () => {
    const params = makeCRFParams();
    const result = viterbiDecode(params);
    expect(result.tags.length).toBe(4);
    expect(result.tags[0]).toBe(0); // highest emission at t=0
    expect(result.tags[1]).toBe(1); // highest emission at t=1
    expect(result.tags[2]).toBe(2); // highest emission at t=2
  });

  it("score is finite", () => {
    const params = makeCRFParams();
    const result = viterbiDecode(params);
    expect(isFinite(result.score)).toBe(true);
  });
});

describe("forwardLogZ", () => {
  it("log partition >= viterbi score (log Z >= best path)", () => {
    const params = makeCRFParams();
    const logZ = forwardLogZ(params);
    const { score } = viterbiDecode(params);
    expect(logZ).toBeGreaterThanOrEqual(score - 1e-9);
  });
});

describe("crfNegLogLikelihood", () => {
  it("nll >= 0 (log Z >= gold path score)", () => {
    const params = makeCRFParams();
    const goldTags = [0, 1, 2, 0];
    const nll = crfNegLogLikelihood(params, goldTags);
    expect(nll).toBeGreaterThanOrEqual(-1e-9);
  });

  it("nll is lower for better tag sequence", () => {
    const params = makeCRFParams();
    const good = [0, 1, 2, 0];
    const bad = [2, 0, 1, 2];
    expect(crfNegLogLikelihood(params, good)).toBeLessThan(crfNegLogLikelihood(params, bad));
  });
});

describe("logSumExp", () => {
  it("logSumExp([0, 0, 0]) ≈ log(3)", () => {
    const vals = new Float64Array([0, 0, 0]);
    expect(logSumExp(vals)).toBeCloseTo(Math.log(3), 5);
  });

  it("logSumExp of single value returns that value", () => {
    const vals = new Float64Array([5.0]);
    expect(logSumExp(vals)).toBeCloseTo(5.0, 5);
  });
});
