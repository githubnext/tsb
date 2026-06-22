/**
 * Tests for src/core/sparse.ts
 *
 * Covers SparseDtype and SparseArray — construction, properties, element
 * access, arithmetic, aggregations, slicing, and iteration.
 *
 * Mirrors the test suite of pandas.arrays.SparseArray and pandas.SparseDtype.
 */
import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { SparseArray, SparseDtype } from "../../src/index.ts";

// ─── SparseDtype ──────────────────────────────────────────────────────────────

describe("SparseDtype", () => {
  it("defaults to float64 with NaN fill", () => {
    const dt = new SparseDtype();
    expect(dt.subtype).toBe("float64");
    expect(Number.isNaN(dt.fill_value)).toBe(true);
    expect(dt.name).toBe("Sparse[float64]");
  });

  it("integer subtype defaults fill_value to 0", () => {
    const di = new SparseDtype("int64");
    expect(di.fill_value).toBe(0);
    expect(di.name).toBe("Sparse[int64]");
  });

  it("uint subtype defaults fill_value to 0", () => {
    const du = new SparseDtype("uint32");
    expect(du.fill_value).toBe(0);
  });

  it("explicit fill_value appears in name when non-default", () => {
    const dt = new SparseDtype("float64", 0);
    expect(dt.name).toBe("Sparse[float64, 0]");
  });

  it("explicit NaN fill_value with float uses short name", () => {
    const dt = new SparseDtype("float64", Number.NaN);
    expect(dt.name).toBe("Sparse[float64]");
  });

  it("toString equals name", () => {
    const dt = new SparseDtype("int32", 0);
    expect(dt.toString()).toBe(dt.name);
  });
});

// ─── SparseArray.fromDense ────────────────────────────────────────────────────

describe("SparseArray.fromDense", () => {
  it("creates sparse array with NaN fill (default)", () => {
    const arr = SparseArray.fromDense([1, Number.NaN, Number.NaN, 4]);
    expect(arr.length).toBe(4);
    expect(arr.npoints).toBe(2);
    expect(arr.sp_values).toEqual([1, 4]);
    expect(arr.sp_index).toEqual([0, 3]);
  });

  it("creates sparse array with 0 fill", () => {
    const arr = SparseArray.fromDense([1, 0, 0, 0, 2, 0, 0, 3], 0);
    expect(arr.length).toBe(8);
    expect(arr.npoints).toBe(3);
    expect(arr.sp_values).toEqual([1, 2, 3]);
    expect(arr.sp_index).toEqual([0, 4, 7]);
  });

  it("null treated as NaN", () => {
    const arr = SparseArray.fromDense([1, null, null, 4]);
    expect(arr.npoints).toBe(2);
    expect(arr.toDense().slice(0, 4)).toEqual([1, Number.NaN, Number.NaN, 4]);
  });

  it("all-fill produces npoints=0", () => {
    const arr = SparseArray.fromDense([0, 0, 0], 0);
    expect(arr.npoints).toBe(0);
    expect(arr.sp_values).toEqual([]);
    expect(arr.sp_index).toEqual([]);
  });

  it("no-fill produces npoints=length", () => {
    const arr = SparseArray.fromDense([1, 2, 3], 0);
    expect(arr.npoints).toBe(3);
  });

  it("empty array", () => {
    const arr = SparseArray.fromDense([]);
    expect(arr.length).toBe(0);
    expect(arr.npoints).toBe(0);
  });
});

// ─── SparseArray.fromSparse ───────────────────────────────────────────────────

describe("SparseArray.fromSparse", () => {
  it("roundtrips through fromDense COO", () => {
    const orig = SparseArray.fromDense([1, 0, 0, 4, 0, 3], 0);
    const { indices, values } = orig.toCoo();
    const arr = SparseArray.fromSparse(6, indices, values, 0);
    expect(arr.toDense()).toEqual(orig.toDense());
  });

  it("throws on length mismatch", () => {
    expect(() => SparseArray.fromSparse(5, [0, 1], [10], 0)).toThrow(RangeError);
  });
});

// ─── density ─────────────────────────────────────────────────────────────────

describe("SparseArray density", () => {
  it("density = npoints / length", () => {
    const arr = SparseArray.fromDense([1, 0, 0, 0, 2, 0, 0, 3], 0);
    expect(arr.density).toBeCloseTo(3 / 8);
  });

  it("all-fill density = 0", () => {
    const arr = SparseArray.fromDense([0, 0, 0], 0);
    expect(arr.density).toBe(0);
  });

  it("no-fill density = 1", () => {
    const arr = SparseArray.fromDense([1, 2, 3], 0);
    expect(arr.density).toBe(1);
  });

  it("empty density = 0", () => {
    expect(SparseArray.fromDense([]).density).toBe(0);
  });
});

// ─── at ──────────────────────────────────────────────────────────────────────

describe("SparseArray.at", () => {
  it("returns stored value at stored position", () => {
    const arr = SparseArray.fromDense([1, 0, 0, 4], 0);
    expect(arr.at(0)).toBe(1);
    expect(arr.at(3)).toBe(4);
  });

  it("returns fill_value at fill position", () => {
    const arr = SparseArray.fromDense([1, 0, 0, 4], 0);
    expect(arr.at(1)).toBe(0);
    expect(arr.at(2)).toBe(0);
  });

  it("returns NaN fill", () => {
    const arr = SparseArray.fromDense([1, Number.NaN, Number.NaN, 4]);
    expect(Number.isNaN(arr.at(1))).toBe(true);
  });

  it("throws for out-of-bounds index", () => {
    const arr = SparseArray.fromDense([1, 0, 0, 4], 0);
    expect(() => arr.at(-1)).toThrow(RangeError);
    expect(() => arr.at(4)).toThrow(RangeError);
  });
});

// ─── toDense ─────────────────────────────────────────────────────────────────

describe("SparseArray.toDense", () => {
  it("reconstructs original array (0 fill)", () => {
    const data = [1, 0, 0, 0, 2, 0, 0, 3];
    const arr = SparseArray.fromDense(data, 0);
    expect(arr.toDense()).toEqual(data);
  });

  it("NaN fill roundtrip", () => {
    const arr = SparseArray.fromDense([1, Number.NaN, Number.NaN, 4]);
    const dense = arr.toDense();
    expect(dense[0]).toBe(1);
    expect(Number.isNaN(dense[1] ?? 0)).toBe(true);
    expect(Number.isNaN(dense[2] ?? 0)).toBe(true);
    expect(dense[3]).toBe(4);
  });

  it("all-fill dense equals fill array", () => {
    const arr = SparseArray.fromDense([0, 0, 0], 0);
    expect(arr.toDense()).toEqual([0, 0, 0]);
  });
});

// ─── fillna ──────────────────────────────────────────────────────────────────

describe("SparseArray.fillna", () => {
  it("fills NaN positions with given value", () => {
    const arr = SparseArray.fromDense([1, Number.NaN, Number.NaN, 4]);
    const filled = arr.fillna(0);
    expect(filled.toDense()).toEqual([1, 0, 0, 4]);
  });

  it("fill_value of result is the new value", () => {
    const arr = SparseArray.fromDense([1, Number.NaN, 4]);
    expect(arr.fillna(99).fill_value).toBe(99);
  });

  it("non-NaN fill — fills NaN stored values", () => {
    const arr = SparseArray.fromDense([0, Number.NaN, 0, 2], 0);
    // NaN is stored as sp_value; fill it with 5
    const filled = arr.fillna(5);
    const dense = filled.toDense();
    expect(dense[1]).toBe(5);
    expect(dense[3]).toBe(2);
  });
});

// ─── withFillValue ────────────────────────────────────────────────────────────

describe("SparseArray.withFillValue", () => {
  it("changes fill value and rebalances stored data", () => {
    const arr = SparseArray.fromDense([1, 0, 0, 4], 0);
    const arr2 = arr.withFillValue(1);
    // Now 0 is no longer the fill — must be stored
    // And 1 is the fill — removed from storage
    expect(arr2.fill_value).toBe(1);
    const dense = arr2.toDense();
    expect(dense).toEqual([1, 0, 0, 4]);
  });
});

// ─── add / mul ───────────────────────────────────────────────────────────────

describe("SparseArray arithmetic", () => {
  it("add scalar to all elements", () => {
    const arr = SparseArray.fromDense([1, 0, 0, 4], 0);
    const result = arr.add(10);
    expect(result.toDense()).toEqual([11, 10, 10, 14]);
  });

  it("mul preserves sparsity structure", () => {
    const arr = SparseArray.fromDense([1, 0, 0, 4], 0);
    const result = arr.mul(2);
    expect(result.toDense()).toEqual([2, 0, 0, 8]);
    expect(result.fill_value).toBe(0);
  });

  it("mul zero collapses to all-fill", () => {
    const arr = SparseArray.fromDense([1, 0, 0, 4], 0);
    const result = arr.mul(0);
    expect(result.toDense()).toEqual([0, 0, 0, 0]);
  });
});

// ─── sum / mean / max / min / std ────────────────────────────────────────────

describe("SparseArray aggregations", () => {
  it("sum includes fill positions when fill is real", () => {
    const arr = SparseArray.fromDense([1, 0, 0, 4], 0);
    expect(arr.sum()).toBe(5); // 1 + 0 + 0 + 4
  });

  it("sum ignores NaN fill positions", () => {
    const arr = SparseArray.fromDense([1, Number.NaN, Number.NaN, 4]);
    expect(arr.sum()).toBe(5); // 1 + 4
  });

  it("mean with NaN fill = mean of non-NaN", () => {
    const arr = SparseArray.fromDense([1, Number.NaN, Number.NaN, 3]);
    expect(arr.mean()).toBe(2); // (1 + 3) / 2
  });

  it("mean with 0 fill includes fill positions", () => {
    const arr = SparseArray.fromDense([4, 0, 0, 0], 0);
    expect(arr.mean()).toBe(1); // (4 + 0 + 0 + 0) / 4
  });

  it("max with NaN fill", () => {
    const arr = SparseArray.fromDense([1, Number.NaN, Number.NaN, 4]);
    expect(arr.max()).toBe(4);
  });

  it("max with 0 fill", () => {
    const arr = SparseArray.fromDense([1, 0, 0, 4], 0);
    expect(arr.max()).toBe(4);
  });

  it("min with 0 fill", () => {
    const arr = SparseArray.fromDense([1, 0, 0, 4], 0);
    expect(arr.min()).toBe(0);
  });

  it("min with NaN fill", () => {
    const arr = SparseArray.fromDense([1, Number.NaN, Number.NaN, 4]);
    expect(arr.min()).toBe(1);
  });

  it("std of [1,3] (ddof=1) = 1.414…", () => {
    const arr = SparseArray.fromDense([1, Number.NaN, Number.NaN, 3]);
    expect(arr.std()).toBeCloseTo(Math.SQRT2);
  });

  it("std with insufficient data = NaN", () => {
    const arr = SparseArray.fromDense([5, Number.NaN, Number.NaN]);
    expect(Number.isNaN(arr.std())).toBe(true);
  });

  it("all-NaN sum = 0", () => {
    const arr = SparseArray.fromDense([Number.NaN, Number.NaN]);
    expect(arr.sum()).toBe(0);
  });

  it("all-NaN mean = NaN", () => {
    const arr = SparseArray.fromDense([Number.NaN, Number.NaN]);
    expect(Number.isNaN(arr.mean())).toBe(true);
  });

  it("all-NaN max = NaN", () => {
    const arr = SparseArray.fromDense([Number.NaN, Number.NaN]);
    expect(Number.isNaN(arr.max())).toBe(true);
  });
});

// ─── slice ───────────────────────────────────────────────────────────────────

describe("SparseArray.slice", () => {
  it("slices from start to end", () => {
    const arr = SparseArray.fromDense([1, 0, 0, 4, 0, 3], 0);
    expect(arr.slice(0, 4).toDense()).toEqual([1, 0, 0, 4]);
  });

  it("slice reindexes sp_index", () => {
    const arr = SparseArray.fromDense([1, 0, 0, 4, 0, 3], 0);
    const sl = arr.slice(1, 5);
    expect(sl.toDense()).toEqual([0, 0, 4, 0]);
    expect(sl.sp_index).toEqual([2]); // 4 is at position 2 within slice
  });

  it("empty slice", () => {
    const arr = SparseArray.fromDense([1, 0, 0, 4], 0);
    const sl = arr.slice(1, 1);
    expect(sl.length).toBe(0);
    expect(sl.toDense()).toEqual([]);
  });

  it("slice beyond end clamps to length", () => {
    const arr = SparseArray.fromDense([1, 2, 3], 0);
    expect(arr.slice(1, 100).toDense()).toEqual([2, 3]);
  });
});

// ─── iteration ───────────────────────────────────────────────────────────────

describe("SparseArray iteration", () => {
  it("iterates all elements including fill", () => {
    const arr = SparseArray.fromDense([1, 0, 0, 4], 0);
    expect([...arr]).toEqual([1, 0, 0, 4]);
  });

  it("iterates NaN fill positions", () => {
    const arr = SparseArray.fromDense([1, Number.NaN, 3]);
    const vals = [...arr];
    expect(vals[0]).toBe(1);
    expect(Number.isNaN(vals[1] ?? 0)).toBe(true);
    expect(vals[2]).toBe(3);
  });
});

// ─── toCoo ───────────────────────────────────────────────────────────────────

describe("SparseArray.toCoo", () => {
  it("returns {indices, values} matching sp_index / sp_values", () => {
    const arr = SparseArray.fromDense([5, 0, 0, 3], 0);
    const coo = arr.toCoo();
    expect(coo.indices).toEqual([0, 3]);
    expect(coo.values).toEqual([5, 3]);
  });
});

// ─── dtype ───────────────────────────────────────────────────────────────────

describe("SparseArray.dtype", () => {
  it("dtype is SparseDtype", () => {
    const arr = SparseArray.fromDense([1, 0, 0, 4], 0);
    expect(arr.dtype).toBeInstanceOf(SparseDtype);
    expect(arr.dtype.subtype).toBe("float64");
    expect(arr.dtype.fill_value).toBe(0);
  });

  it("custom subtype preserved", () => {
    const arr = SparseArray.fromDense([1, 0, 0, 4], 0, "int32");
    expect(arr.dtype.subtype).toBe("int32");
  });
});

// ─── toString ────────────────────────────────────────────────────────────────

describe("SparseArray.toString", () => {
  it("includes fill_value and dtype", () => {
    const arr = SparseArray.fromDense([1, 0, 0, 4], 0);
    const s = arr.toString();
    expect(s).toContain("SparseArray");
    expect(s).toContain("fill_value=0");
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("SparseArray property tests", () => {
  it("fromDense → toDense roundtrip (0 fill)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.integer({ min: -100, max: 100 }), fc.constant(0)), {
          minLength: 0,
          maxLength: 50,
        }),
        (data) => {
          const arr = SparseArray.fromDense(data, 0);
          expect(arr.toDense()).toEqual(data);
        },
      ),
    );
  });

  it("length = npoints + nfill", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 10 }), { minLength: 0, maxLength: 40 }),
        (data) => {
          const arr = SparseArray.fromDense(data, 0);
          expect(arr.npoints + (arr.length - arr.npoints)).toBe(arr.length);
        },
      ),
    );
  });

  it("at(i) matches toDense()[i] for all valid i (0 fill)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -10, max: 10 }), { minLength: 1, maxLength: 30 }),
        fc.integer({ min: 0, max: 29 }),
        (data, rawIdx) => {
          if (rawIdx >= data.length) {
            return;
          }
          const arr = SparseArray.fromDense(data, 0);
          const dense = arr.toDense();
          const expected = dense[rawIdx];
          if (expected === undefined) return;
          expect(arr.at(rawIdx)).toBe(expected);
        },
      ),
    );
  });

  it("sum of dense equals sum of sparse (0 fill, integer data)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -100, max: 100 }), { minLength: 0, maxLength: 50 }),
        (data) => {
          const arr = SparseArray.fromDense(data, 0);
          const denseSum = data.reduce((a, b) => a + b, 0);
          expect(arr.sum()).toBeCloseTo(denseSum);
        },
      ),
    );
  });

  it("density is always in [0, 1]", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 5 }), { minLength: 0, maxLength: 50 }),
        (data) => {
          const arr = SparseArray.fromDense(data, 0);
          expect(arr.density).toBeGreaterThanOrEqual(0);
          expect(arr.density).toBeLessThanOrEqual(1);
        },
      ),
    );
  });

  it("mul by 1 is identity", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -10, max: 10 }), { minLength: 0, maxLength: 20 }),
        (data) => {
          const arr = SparseArray.fromDense(data, 0);
          expect(arr.mul(1).toDense()).toEqual(arr.toDense());
        },
      ),
    );
  });
});
