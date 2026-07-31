/**
 * Tests for src/ml/random_forest.ts
 */
import { describe, expect, it } from "bun:test";
import { fitRandomForest, predictRandomForest, LCGRandom, r2Score } from "../../src/index.ts";

describe("LCGRandom", () => {
  it("returns values in [0, 1)", () => {
    const rng = new LCGRandom(42);
    for (let i = 0; i < 100; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("nextInt returns values in [0, n)", () => {
    const rng = new LCGRandom(12345);
    for (let i = 0; i < 50; i++) {
      const v = rng.nextInt(10);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(10);
    }
  });
});

describe("fitRandomForest — regression", () => {
  const n = 30;
  const X: Float64Array[] = Array.from({ length: n }, (_, i) =>
    new Float64Array([i / 10, (i % 5) / 5])
  );
  const y = Float64Array.from({ length: n }, (_, i) => (i / 10) * 2 + ((i % 5) / 5));

  it("trains and predicts without error", () => {
    const model = fitRandomForest(X, y, { nEstimators: 20, maxDepth: 3, seed: 1 });
    const preds = predictRandomForest(model, X);
    expect(preds.length).toBe(n);
  });

  it("achieves r2 > 0.7 on training set", () => {
    const model = fitRandomForest(X, y, { nEstimators: 50, maxDepth: 5, seed: 42 });
    const preds = predictRandomForest(model, X);
    const r2 = r2Score(y, preds);
    expect(r2).toBeGreaterThan(0.7);
  });
});
