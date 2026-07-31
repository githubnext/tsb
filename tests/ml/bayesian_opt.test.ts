/**
 * Tests for src/ml/bayesian_opt.ts
 */
import { describe, expect, it } from "bun:test";
import {
  rbfKernel,
  maternKernel52,
  cholesky,
  gpPredict,
  normalCDF,
  normalPDF,
  expectedImprovement,
  upperConfidenceBound,
  initBOState,
  suggestNext,
} from "../../src/index.ts";

describe("kernels", () => {
  it("rbf kernel is 1 for identical points", () => {
    const x = new Float64Array([1, 2, 3]);
    expect(rbfKernel(x, x, 1, 1)).toBeCloseTo(1);
  });

  it("rbf kernel decreases with distance", () => {
    const x0 = new Float64Array([0]);
    const x1 = new Float64Array([1]);
    const x2 = new Float64Array([2]);
    expect(rbfKernel(x0, x1, 1, 1)).toBeGreaterThan(rbfKernel(x0, x2, 1, 1));
  });

  it("matern52 is 1 for identical points", () => {
    const x = new Float64Array([0, 0]);
    expect(maternKernel52(x, x, 1, 1)).toBeCloseTo(1);
  });
});

describe("cholesky", () => {
  it("L L^T ≈ A for 2x2 SPD matrix", () => {
    const A = new Float64Array([4, 2, 2, 3]);
    const L = cholesky(A, 2);
    // L L^T
    const LLT = new Float64Array(4);
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        let sum = 0;
        for (let k = 0; k < 2; k++) sum += (L[i * 2 + k] ?? 0) * (L[j * 2 + k] ?? 0);
        LLT[i * 2 + j] = sum;
      }
    }
    expect(LLT[0]!).toBeCloseTo(4, 4);
    expect(LLT[1]!).toBeCloseTo(2, 4);
    expect(LLT[3]!).toBeCloseTo(3, 4);
  });
});

describe("gpPredict", () => {
  it("interpolates: mean near observed value at observed point", () => {
    const X = [new Float64Array([0]), new Float64Array([1]), new Float64Array([2])];
    const y = new Float64Array([0, 1, 0]);
    const { kernelMatrix, cholesky: ch } = (() => {
      const K = new Float64Array(9);
      for (let i = 0; i < 3; i++) {
        for (let j = i; j < 3; j++) {
          const k = rbfKernel(X[i]!, X[j]!, 1, 1);
          K[i * 3 + j] = k;
          K[j * 3 + i] = k;
        }
        K[i * 3 + i] += 0.01;
      }
      return { kernelMatrix: K, cholesky: cholesky(K, 3) };
    })();
    const { mean } = gpPredict(new Float64Array([1]), X, y, ch, 1, 1, 0.01);
    expect(Math.abs(mean - 1)).toBeLessThan(0.2);
  });
});

describe("normalCDF and normalPDF", () => {
  it("normalCDF(0) ≈ 0.5", () => {
    expect(normalCDF(0)).toBeCloseTo(0.5, 2);
  });

  it("normalPDF(0) ≈ 0.3989", () => {
    expect(normalPDF(0)).toBeCloseTo(1 / Math.sqrt(2 * Math.PI), 4);
  });
});

describe("acquisitions", () => {
  it("EI >= 0", () => {
    expect(expectedImprovement(1.5, 0.1, 1.0)).toBeGreaterThanOrEqual(0);
  });

  it("UCB increases with variance", () => {
    expect(upperConfidenceBound(1, 0.5, 2)).toBeGreaterThan(upperConfidenceBound(1, 0.1, 2));
  });
});

describe("suggestNext", () => {
  it("returns a candidate", () => {
    const X = [new Float64Array([0]), new Float64Array([1])];
    const y = new Float64Array([0, 1]);
    const state = initBOState(X, y);
    const candidates = [new Float64Array([0.5]), new Float64Array([1.5]), new Float64Array([2.0])];
    const { bestCandidate } = suggestNext(state, candidates);
    expect(bestCandidate.length).toBe(1);
  });
});
