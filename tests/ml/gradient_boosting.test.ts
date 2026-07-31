/**
 * Tests for src/ml/gradient_boosting.ts
 */
import { describe, expect, it } from "bun:test";
import { buildTree, treePredict, treePredictOne, fitGBM, predictGBM, mse, r2Score } from "../../src/index.ts";

describe("decision tree", () => {
  const X: Float64Array[] = [
    new Float64Array([1]),
    new Float64Array([2]),
    new Float64Array([3]),
    new Float64Array([4]),
    new Float64Array([5]),
  ];
  const y = new Float64Array([1, 2, 3, 4, 5]);

  it("builds a tree and predicts", () => {
    const tree = buildTree(X, y, [0, 1, 2, 3, 4], 0, { maxDepth: 3, minSamplesLeaf: 1 });
    const preds = treePredict(tree, X);
    expect(preds.length).toBe(5);
  });

  it("leaf prediction is mean of remaining samples", () => {
    const tree = buildTree(X, y, [0, 1, 2, 3, 4], 0, { maxDepth: 0, minSamplesLeaf: 1 });
    const pred = treePredictOne(tree, new Float64Array([2.5]));
    expect(pred).toBeCloseTo(3, 0); // mean of [1,2,3,4,5]
  });
});

describe("GBM — simple regression", () => {
  const n = 20;
  const X: Float64Array[] = Array.from({ length: n }, (_, i) => new Float64Array([i / 10]));
  const y = Float64Array.from({ length: n }, (_, i) => (i / 10) * 2 + 1);

  it("fits and predicts", () => {
    const model = fitGBM(X, y, 50, 0.1, 3, 1);
    const preds = predictGBM(model, X);
    expect(preds.length).toBe(n);
  });

  it("achieves r2 > 0.9", () => {
    const model = fitGBM(X, y, 100, 0.1, 3, 1);
    const preds = predictGBM(model, X);
    const r2 = r2Score(y, preds);
    expect(r2).toBeGreaterThan(0.9);
  });
});

describe("mse and r2Score", () => {
  it("mse of perfect predictions is 0", () => {
    const y = new Float64Array([1, 2, 3]);
    expect(mse(y, y)).toBeCloseTo(0);
  });

  it("r2 of perfect predictions is 1", () => {
    const y = new Float64Array([1, 2, 3, 4]);
    expect(r2Score(y, y)).toBeCloseTo(1);
  });

  it("r2 of constant predictions is ≤ 0", () => {
    const y = new Float64Array([1, 2, 3, 4]);
    const constant = new Float64Array([2, 2, 2, 2]);
    expect(r2Score(y, constant)).toBeLessThanOrEqual(0.1);
  });
});
