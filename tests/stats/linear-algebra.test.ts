/**
 * Tests for linear algebra utilities.
 */
import { describe, expect, it } from "bun:test";
import {
  det,
  dot,
  lstsq,
  matmul,
  matvec,
  norm,
  outer,
  transpose,
  vadd,
  vscale,
  vsub,
} from "../../src/index.ts";

const EPSILON = 1e-9;

function approxEq(a: number, b: number): boolean {
  return Math.abs(a - b) < EPSILON;
}

function approxArray(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (!approxEq(a[i] ?? 0, b[i] ?? 0)) {
      return false;
    }
  }
  return true;
}

describe("dot", () => {
  it("computes inner product of two vectors", () => {
    expect(dot([1, 2, 3], [4, 5, 6])).toBe(32);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(dot([1, 0], [0, 1])).toBe(0);
  });

  it("throws when lengths differ", () => {
    expect(() => dot([1, 2], [1, 2, 3])).toThrow(RangeError);
  });
});

describe("outer", () => {
  it("computes outer product", () => {
    const result = outer([1, 2], [3, 4]);
    expect(result[0]).toEqual([3, 4]);
    expect(result[1]).toEqual([6, 8]);
  });
});

describe("vadd / vsub / vscale", () => {
  it("vadd adds element-wise", () => {
    expect(vadd([1, 2, 3], [4, 5, 6])).toEqual([5, 7, 9]);
  });

  it("vsub subtracts element-wise", () => {
    expect(vsub([5, 7], [2, 3])).toEqual([3, 4]);
  });

  it("vscale multiplies by scalar", () => {
    expect(vscale([1, 2, 3], 2)).toEqual([2, 4, 6]);
  });

  it("vadd throws on mismatched lengths", () => {
    expect(() => vadd([1, 2], [1])).toThrow(RangeError);
  });
});

describe("norm", () => {
  it("computes L2 norm", () => {
    expect(approxEq(norm([3, 4]), 5)).toBe(true);
  });

  it("norm of zero vector is 0", () => {
    expect(norm([0, 0, 0])).toBe(0);
  });
});

describe("matmul", () => {
  it("multiplies 2x2 matrices", () => {
    const a = [
      [1, 2],
      [3, 4],
    ];
    const b = [
      [5, 6],
      [7, 8],
    ];
    const c = matmul(a, b);
    expect(c[0]).toEqual([19, 22]);
    expect(c[1]).toEqual([43, 50]);
  });

  it("throws on incompatible dimensions", () => {
    expect(() =>
      matmul(
        [[1, 2, 3]],
        [
          [1, 2],
          [3, 4],
        ],
      ),
    ).toThrow(RangeError);
  });
});

describe("transpose", () => {
  it("transposes a matrix", () => {
    const t = transpose([
      [1, 2, 3],
      [4, 5, 6],
    ]);
    expect(t[0]).toEqual([1, 4]);
    expect(t[1]).toEqual([2, 5]);
    expect(t[2]).toEqual([3, 6]);
  });
});

describe("matvec", () => {
  it("multiplies matrix by vector", () => {
    const result = matvec(
      [
        [1, 2],
        [3, 4],
      ],
      [1, 1],
    );
    expect(result).toEqual([3, 7]);
  });
});

describe("lstsq", () => {
  it("solves exactly determined system", () => {
    const a = [
      [1, 0],
      [0, 1],
    ];
    const b = [3, 4];
    const { coefficients, rank } = lstsq(a, b);
    expect(approxArray(coefficients, [3, 4])).toBe(true);
    expect(rank).toBe(2);
  });

  it("solves overdetermined system (linear regression)", () => {
    const a = [
      [1, 1],
      [1, 2],
      [1, 3],
      [1, 4],
    ];
    const b = [3, 5, 7, 9];
    const { coefficients } = lstsq(a, b);
    expect(approxEq(coefficients[0] ?? 0, 1)).toBe(true);
    expect(approxEq(coefficients[1] ?? 0, 2)).toBe(true);
  });

  it("throws when underdetermined", () => {
    expect(() => lstsq([[1, 2, 3]], [1])).toThrow(RangeError);
  });

  it("throws when b length mismatches rows", () => {
    expect(() =>
      lstsq(
        [
          [1, 1],
          [2, 2],
        ],
        [1],
      ),
    ).toThrow(RangeError);
  });
});

describe("det", () => {
  it("det of 1x1 matrix", () => {
    expect(det([[5]])).toBe(5);
  });

  it("det of 2x2 matrix", () => {
    expect(
      det([
        [1, 2],
        [3, 4],
      ]),
    ).toBe(-2);
  });

  it("det of 3x3 identity is 1", () => {
    const I = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
    expect(approxEq(det(I), 1)).toBe(true);
  });

  it("det of singular matrix is 0", () => {
    const m = [
      [1, 2],
      [2, 4],
    ];
    expect(approxEq(det(m), 0)).toBe(true);
  });

  it("throws for non-square matrix", () => {
    expect(() =>
      det([
        [1, 2, 3],
        [4, 5, 6],
      ]),
    ).toThrow(RangeError);
  });
});
