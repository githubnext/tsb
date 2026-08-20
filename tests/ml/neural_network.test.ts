/**
 * Tests for src/ml/neural_network.ts
 */
import { describe, expect, it } from "bun:test";
import {
  denseForward,
  relu,
  sigmoidActivation,
  softmaxCrossEntropy,
  mseLoss,
  initAdam,
  adamStep,
  heInit,
} from "../../src/index.ts";

describe("denseForward", () => {
  it("computes W x + b correctly", () => {
    const W = new Float64Array([1, 0, 0, 1]); // identity 2x2
    const b = new Float64Array([1, 2]);
    const x = new Float64Array([3, 4]);
    const out = denseForward(x, W, b, 2, 2);
    expect(out[0]).toBeCloseTo(4); // 3 + 1
    expect(out[1]).toBeCloseTo(6); // 4 + 2
  });
});

describe("relu", () => {
  it("passes positive values unchanged", () => {
    const x = new Float64Array([1, 2, 3]);
    const out = relu(x);
    expect(out[0]).toBe(1);
    expect(out[1]).toBe(2);
  });

  it("zeros negative values", () => {
    const x = new Float64Array([-1, -2, 0]);
    const out = relu(x);
    expect(out[0]).toBe(0);
    expect(out[1]).toBe(0);
    expect(out[2]).toBe(0);
  });
});

describe("sigmoidActivation", () => {
  it("sigmoid(0) = 0.5", () => {
    const x = new Float64Array([0]);
    expect(sigmoidActivation(x)[0]).toBeCloseTo(0.5);
  });

  it("output is in (0,1)", () => {
    const x = new Float64Array([-10, 0, 10]);
    const out = sigmoidActivation(x);
    for (let i = 0; i < 3; i++) {
      expect(out[i]!).toBeGreaterThan(0);
      expect(out[i]!).toBeLessThan(1);
    }
  });
});

describe("softmaxCrossEntropy", () => {
  it("loss is 0 when prediction is perfect", () => {
    const logits = new Float64Array([100, 0, 0]);
    const labels = new Float64Array([1, 0, 0]);
    const { loss } = softmaxCrossEntropy(logits, labels);
    expect(loss).toBeCloseTo(0, 2);
  });

  it("dLogits sum to 0", () => {
    const logits = new Float64Array([1, 2, 3]);
    const labels = new Float64Array([0, 1, 0]);
    const { dLogits } = softmaxCrossEntropy(logits, labels);
    let sum = 0;
    for (let i = 0; i < 3; i++) sum += dLogits[i]!;
    expect(sum).toBeCloseTo(0, 5);
  });
});

describe("mseLoss", () => {
  it("loss is 0 for perfect prediction", () => {
    const y = new Float64Array([1, 2, 3]);
    const { loss } = mseLoss(y, y);
    expect(loss).toBeCloseTo(0);
  });
});

describe("adamStep", () => {
  it("reduces a simple parameter towards zero", () => {
    const params = new Float64Array([1.0]);
    const grads = new Float64Array([1.0]);
    let state = initAdam(1);
    for (let i = 0; i < 100; i++) {
      state = adamStep(params, grads, state);
    }
    expect(params[0]!).toBeLessThan(0.9);
  });
});

describe("heInit", () => {
  it("returns correct size", () => {
    const w = heInit(10, 5);
    expect(w.length).toBe(50);
  });

  it("mean is roughly 0", () => {
    const w = heInit(100, 100);
    let sum = 0;
    for (let i = 0; i < w.length; i++) sum += w[i]!;
    expect(Math.abs(sum / w.length)).toBeLessThan(0.1);
  });
});
