/**
 * Tests for src/ml/svm.ts
 */
import { describe, expect, it } from "bun:test";
import { computeKernel, fitSVM, svmPredict, svmAccuracy } from "../../src/index.ts";

describe("computeKernel", () => {
  it("linear kernel is dot product", () => {
    const x1 = new Float64Array([1, 2]);
    const x2 = new Float64Array([3, 4]);
    const cfg = { type: "linear" as const, gamma: 1, degree: 2, coef0: 0 };
    expect(computeKernel(x1, x2, cfg)).toBeCloseTo(11);
  });

  it("rbf kernel is 1 for identical points", () => {
    const x = new Float64Array([1, 2, 3]);
    const cfg = { type: "rbf" as const, gamma: 0.5, degree: 2, coef0: 0 };
    expect(computeKernel(x, x, cfg)).toBeCloseTo(1);
  });
});

describe("fitSVM — linearly separable", () => {
  const X: Float64Array[] = [
    new Float64Array([-2]), new Float64Array([-1]),
    new Float64Array([1]), new Float64Array([2]),
  ];
  const y = new Float64Array([-1, -1, 1, 1]);

  it("achieves 100% accuracy on training set", () => {
    const model = fitSVM(X, y, 1.0, { type: "linear", gamma: 1, degree: 2, coef0: 0 }, 100);
    const acc = svmAccuracy(model, X, y);
    expect(acc).toBeCloseTo(1.0, 1);
  });

  it("predicts correct labels", () => {
    const model = fitSVM(X, y, 1.0, { type: "linear", gamma: 1, degree: 2, coef0: 0 }, 100);
    const preds = svmPredict(model, [new Float64Array([-1.5]), new Float64Array([1.5])]);
    expect(preds[0]).toBe(-1);
    expect(preds[1]).toBe(1);
  });
});
