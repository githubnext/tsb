/**
 * Tests for src/ml/attention.ts
 */
import { describe, expect, it } from "bun:test";
import {
  sinusoidalPositionalEncoding,
  causalMask,
  applyRoPE,
} from "../../src/index.ts";

describe("sinusoidalPositionalEncoding", () => {
  it("returns correct dimensions", () => {
    const pe = sinusoidalPositionalEncoding(10, 16);
    expect(pe.length).toBe(10 * 16);
  });

  it("sin/cos values are in [-1, 1]", () => {
    const pe = sinusoidalPositionalEncoding(5, 8);
    for (let i = 0; i < pe.length; i++) {
      expect(pe[i]!).toBeGreaterThanOrEqual(-1);
      expect(pe[i]!).toBeLessThanOrEqual(1);
    }
  });
});

describe("causalMask", () => {
  it("upper triangle is -Infinity", () => {
    const mask = causalMask(3);
    // (0,1), (0,2), (1,2) should be -Infinity
    expect(mask[0 * 3 + 1]).toBe(-Infinity);
    expect(mask[0 * 3 + 2]).toBe(-Infinity);
    expect(mask[1 * 3 + 2]).toBe(-Infinity);
  });

  it("diagonal is 0", () => {
    const mask = causalMask(4);
    for (let i = 0; i < 4; i++) expect(mask[i * 4 + i]).toBe(0);
  });
});

describe("applyRoPE", () => {
  it("returns same dimensions", () => {
    const x = new Float64Array(3 * 4); // seqLen=3, dHead=4
    const out = applyRoPE(x, 3, 4);
    expect(out.length).toBe(12);
  });

  it("preserves norm (approximately)", () => {
    const x = new Float64Array([1, 0, 1, 0, 0, 1, 0, 1]); // seqLen=2, dHead=4
    const out = applyRoPE(x, 2, 4);
    // Each 2D pair should have same norm as input pair
    const normIn = Math.sqrt((x[0]! ** 2) + (x[1]! ** 2));
    const normOut = Math.sqrt((out[0]! ** 2) + (out[1]! ** 2));
    expect(normOut).toBeCloseTo(normIn, 5);
  });
});
