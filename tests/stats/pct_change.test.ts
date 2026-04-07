/**
 * Tests for pct_change — percentage change for Series and DataFrame.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { DataFrame, Series, dataFramePctChange, pctChange } from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

const nan = Number.NaN;

function close(a: number, b: number, tol = 1e-10): boolean {
  if (Number.isNaN(a) && Number.isNaN(b)) {
    return true;
  }
  if (!(Number.isFinite(a) || Number.isFinite(b))) {
    return a === b;
  }
  return Math.abs(a - b) <= tol;
}

function allClose(a: number[], b: number[], tol = 1e-10): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((v, i) => close(v, b[i] ?? nan, tol));
}

/** Safely coerce a Scalar to number for comparison. */
function num(v: Scalar | undefined): number {
  if (v === null || v === undefined) {
    return Number.NaN;
  }
  if (typeof v === "number") {
    return v;
  }
  return Number.NaN;
}

/** Map a Scalar array to a number array for comparison. */
function toNums(arr: readonly Scalar[]): number[] {
  return arr.map(num);
}

// ─── pctChange ────────────────────────────────────────────────────────────────

describe("pctChange", () => {
  it("default periods=1 on simple ascending series", () => {
    const s = new Series({ data: [100, 110, 121, 133.1] });
    const r = pctChange(s);
    expect(Number.isNaN(r.values[0])).toBe(true);
    expect(close(r.values[1] ?? nan, 0.1)).toBe(true);
    expect(close(r.values[2] ?? nan, 0.1)).toBe(true);
    expect(close(r.values[3] ?? nan, 0.1)).toBe(true);
  });

  it("periods=2", () => {
    const s = new Series({ data: [100, 110, 121] });
    const r = pctChange(s, 2);
    expect(Number.isNaN(r.values[0])).toBe(true);
    expect(Number.isNaN(r.values[1])).toBe(true);
    expect(close(r.values[2] ?? nan, 0.21)).toBe(true);
  });

  it("negative periods (forward lag)", () => {
    // [100, 110, 121] → periods=-1: result[i] = (vals[i] - vals[i+1]) / |vals[i+1]|
    const s = new Series({ data: [100, 110, 121] });
    const r = pctChange(s, -1);
    // result[0] = (100-110)/110 = -0.0909...
    expect(close(r.values[0] ?? nan, (100 - 110) / 110)).toBe(true);
    // result[1] = (110-121)/121 = -0.0909...
    expect(close(r.values[1] ?? nan, (110 - 121) / 121)).toBe(true);
    // result[2] = NaN (no forward value)
    expect(Number.isNaN(r.values[2])).toBe(true);
  });

  it("periods=0 → all NaN", () => {
    const s = new Series({ data: [1, 2, 3] });
    const r = pctChange(s, 0);
    expect(r.values.every((v) => Number.isNaN(v))).toBe(true);
  });

  it("single-element series → all NaN", () => {
    const s = new Series({ data: [42] });
    expect(Number.isNaN(pctChange(s).values[0])).toBe(true);
  });

  it("propagates NaN/null through computation", () => {
    const s = new Series<Scalar>({ data: [100, null, 110] });
    const r = pctChange(s);
    expect(Number.isNaN(r.values[0])).toBe(true); // first element
    expect(Number.isNaN(r.values[1])).toBe(true); // prior is valid but current is null
    expect(Number.isNaN(r.values[2])).toBe(true); // prior is null
  });

  it("zero prior value → Infinity or -Infinity", () => {
    // [1, 0, -5]: pct_change with periods=1
    // result[0] = NaN (no prior)
    // result[1] = (0 - 1)/|1| = -1
    // result[2] = (-5 - 0)/|0| = -Infinity
    const s = new Series({ data: [1, 0, -5] });
    const r = pctChange(s);
    expect(Number.isNaN(r.values[0])).toBe(true);
    expect(r.values[1]).toBe(-1);
    expect(r.values[2]).toBe(Number.NEGATIVE_INFINITY);
    // Also test positive infinity
    const s2 = new Series({ data: [0, 5] });
    const r2 = pctChange(s2);
    expect(r2.values[1]).toBe(Number.POSITIVE_INFINITY);
  });

  it("preserves index", () => {
    const s = new Series({ data: [1, 2, 3], index: ["a", "b", "c"] });
    const r = pctChange(s);
    expect(r.index.toArray()).toEqual(["a", "b", "c"]);
  });

  it("preserves name", () => {
    const s = new Series({ data: [1, 2, 3], name: "price" });
    const r = pctChange(s);
    expect(r.name).toBe("price");
  });

  it("all NaN series → all NaN output", () => {
    const s = new Series<Scalar>({ data: [null, null, null] });
    const r = pctChange(s);
    expect(r.values.every((v) => Number.isNaN(v))).toBe(true);
  });

  it("empty series → empty output", () => {
    const s = new Series({ data: [] as number[] });
    const r = pctChange(s);
    expect(r.values).toEqual([]);
  });

  it("returns number series regardless of input type", () => {
    const s = new Series<Scalar>({ data: [1, 2, 4] });
    const r = pctChange(s);
    expect(r.dtype.name).toBe("float64");
  });

  it("large periods beyond array length → all NaN", () => {
    const s = new Series({ data: [1, 2, 3] });
    const r = pctChange(s, 10);
    expect(r.values.every((v) => Number.isNaN(v))).toBe(true);
  });

  it("constant series → all zeros except first", () => {
    const s = new Series({ data: [5, 5, 5, 5] });
    const r = pctChange(s);
    expect(Number.isNaN(r.values[0])).toBe(true);
    expect(r.values[1]).toBe(0);
    expect(r.values[2]).toBe(0);
    expect(r.values[3]).toBe(0);
  });

  it("matches manual formula", () => {
    const data = [3, 6, 2, 8, 4];
    const s = new Series({ data });
    const r = pctChange(s);
    for (let i = 1; i < data.length; i++) {
      const expected = ((data[i] ?? nan) - (data[i - 1] ?? nan)) / Math.abs(data[i - 1] ?? nan);
      expect(close(r.values[i] ?? nan, expected)).toBe(true);
    }
  });

  it("sign convention: decrease by half → -0.5", () => {
    const s = new Series({ data: [100, 50] });
    expect(close(pctChange(s).values[1] ?? nan, -0.5)).toBe(true);
  });

  it("sign convention: double → 1.0", () => {
    const s = new Series({ data: [50, 100] });
    expect(close(pctChange(s).values[1] ?? nan, 1.0)).toBe(true);
  });

  it("negative values compute correctly", () => {
    const s = new Series({ data: [-100, -80, -160] });
    const r = pctChange(s);
    expect(close(r.values[1] ?? nan, (-80 - -100) / 100)).toBe(true);
    expect(close(r.values[2] ?? nan, (-160 - -80) / 80)).toBe(true);
  });

  it("periods=1 with labeled index", () => {
    const s = new Series({ data: [10, 15, 12], index: ["x", "y", "z"] });
    const r = pctChange(s);
    expect(close(r.values[1] ?? nan, 0.5)).toBe(true);
    expect(close(r.values[2] ?? nan, (12 - 15) / 15)).toBe(true);
  });
});

// ─── dataFramePctChange — axis=0 ──────────────────────────────────────────────

describe("dataFramePctChange — axis=0 (column-wise, default)", () => {
  it("basic column-wise percentage change", () => {
    const df = DataFrame.fromColumns({ a: [100, 110, 121], b: [200, 220, 242] });
    const r = dataFramePctChange(df);
    const ca = r.col("a").values;
    const cb = r.col("b").values;
    expect(Number.isNaN(num(ca[0]))).toBe(true);
    expect(close(num(ca[1]), 0.1)).toBe(true);
    expect(close(num(ca[2]), 0.1)).toBe(true);
    expect(Number.isNaN(num(cb[0]))).toBe(true);
    expect(close(num(cb[1]), 0.1)).toBe(true);
    expect(close(num(cb[2]), 0.1)).toBe(true);
  });

  it("periods=2", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 4, 8] });
    const r = dataFramePctChange(df, 2);
    const ca = r.col("a").values;
    expect(Number.isNaN(num(ca[0]))).toBe(true);
    expect(Number.isNaN(num(ca[1]))).toBe(true);
    expect(close(num(ca[2]), 3)).toBe(true); // (4-1)/1
    expect(close(num(ca[3]), 3)).toBe(true); // (8-2)/2
  });

  it("preserves column names and index", () => {
    const df = DataFrame.fromColumns({ x: [1, 2], y: [3, 6] });
    const r = dataFramePctChange(df);
    expect(r.columns.toArray()).toEqual(["x", "y"]);
    expect(r.index.toArray()).toEqual(df.index.toArray());
  });

  it("explicit axis=0 matches default", () => {
    const df = DataFrame.fromColumns({ a: [10, 20, 30] });
    const r0 = dataFramePctChange(df, 1, { axis: 0 });
    const rDef = dataFramePctChange(df);
    expect(allClose(toNums(r0.col("a").values), toNums(rDef.col("a").values))).toBe(true);
  });

  it("axis='index' matches axis=0", () => {
    const df = DataFrame.fromColumns({ a: [10, 20, 30] });
    const r1 = dataFramePctChange(df, 1, { axis: "index" });
    const rDef = dataFramePctChange(df);
    expect(allClose(toNums(r1.col("a").values), toNums(rDef.col("a").values))).toBe(true);
  });

  it("NaN/null in column propagates", () => {
    const df = DataFrame.fromColumns({ a: [100, null, 110] as Scalar[] });
    const r = dataFramePctChange(df);
    const ca = r.col("a").values;
    expect(Number.isNaN(num(ca[0]))).toBe(true);
    expect(Number.isNaN(num(ca[1]))).toBe(true);
    expect(Number.isNaN(num(ca[2]))).toBe(true); // prior is null
  });

  it("zero prior value → Infinity in column", () => {
    const df = DataFrame.fromColumns({ a: [0, 10] });
    const r = dataFramePctChange(df);
    expect(num(r.col("a").values[1])).toBe(Number.POSITIVE_INFINITY);
  });
});

// ─── dataFramePctChange — axis=1 ──────────────────────────────────────────────

describe("dataFramePctChange — axis=1 (row-wise)", () => {
  it("row-wise percentage change", () => {
    const df = DataFrame.fromColumns({ a: [100, 200], b: [110, 220] });
    const r = dataFramePctChange(df, 1, { axis: 1 });
    // row 0: [100, 110] → a=NaN, b=(110-100)/100=0.1
    expect(Number.isNaN(num(r.col("a").values[0]))).toBe(true);
    expect(close(num(r.col("b").values[0]), 0.1)).toBe(true);
    // row 1: [200, 220] → a=NaN, b=(220-200)/200=0.1
    expect(Number.isNaN(num(r.col("a").values[1]))).toBe(true);
    expect(close(num(r.col("b").values[1]), 0.1)).toBe(true);
  });

  it("axis='columns' matches axis=1", () => {
    const df = DataFrame.fromColumns({ a: [1, 2], b: [2, 4], c: [4, 8] });
    const r1 = dataFramePctChange(df, 1, { axis: 1 });
    const r2 = dataFramePctChange(df, 1, { axis: "columns" });
    for (const col of ["a", "b", "c"]) {
      expect(allClose(toNums(r1.col(col).values), toNums(r2.col(col).values))).toBe(true);
    }
  });

  it("preserves shape on row-wise", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3], b: [4, 5, 6], c: [7, 8, 9] });
    const r = dataFramePctChange(df, 1, { axis: 1 });
    expect(r.shape).toEqual([3, 3]);
  });

  it("single-column DataFrame with axis=1 → all NaN", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    const r = dataFramePctChange(df, 1, { axis: 1 });
    expect(r.col("a").values.every((v) => Number.isNaN(num(v)))).toBe(true);
  });

  it("row-wise periods=2", () => {
    // 4 columns; periods=2 → first 2 cols NaN, rest computed
    const df = DataFrame.fromColumns({ a: [10, 20], b: [20, 40], c: [30, 60], d: [40, 80] });
    const r = dataFramePctChange(df, 2, { axis: 1 });
    // row 0: [10,20,30,40] → a=NaN, b=NaN, c=(30-10)/10=2, d=(40-20)/20=1
    expect(Number.isNaN(num(r.col("a").values[0]))).toBe(true);
    expect(Number.isNaN(num(r.col("b").values[0]))).toBe(true);
    expect(close(num(r.col("c").values[0]), 2)).toBe(true);
    expect(close(num(r.col("d").values[0]), 1)).toBe(true);
  });
});

// ─── property-based tests ─────────────────────────────────────────────────────

describe("pctChange — property tests", () => {
  it("output length always equals input length", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 0,
          maxLength: 20,
        }),
        fc.integer({ min: -5, max: 5 }),
        (data, periods) => {
          const s = new Series({ data });
          const r = pctChange(s, periods);
          return r.values.length === data.length;
        },
      ),
    );
  });

  it("pctChange(s, 1) satisfies: non-nan result[i] ≈ (s[i]-s[i-1])/|s[i-1]|", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true, min: 0.01, max: 1000 }), {
          minLength: 2,
          maxLength: 20,
        }),
        (data) => {
          const s = new Series({ data });
          const r = pctChange(s);
          for (let i = 1; i < data.length; i++) {
            const cur = data[i] ?? nan;
            const prior = data[i - 1] ?? nan;
            const expected = (cur - prior) / Math.abs(prior);
            if (!close(r.values[i] ?? nan, expected, 1e-9)) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });

  it("pctChange then reconstruct original values (up to initial NaN)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ noNaN: true, noDefaultInfinity: true, min: 1, max: 100 }), {
          minLength: 2,
          maxLength: 15,
        }),
        (data) => {
          // All values positive, so we can reconstruct: s[i] = s[i-1] * (1 + pct[i])
          const s = new Series({ data });
          const r = pctChange(s);
          const reconstructed: number[] = [data[0] ?? nan];
          for (let i = 1; i < data.length; i++) {
            const prev = reconstructed[i - 1] ?? nan;
            reconstructed.push(prev * (1 + (r.values[i] ?? nan)));
          }
          return reconstructed.every((v, i) => close(v, data[i] ?? nan, 1e-6));
        },
      ),
    );
  });

  it("dataFramePctChange shape invariant", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }).chain((nrows) =>
          fc.integer({ min: 1, max: 4 }).chain((ncols) =>
            fc
              .array(
                fc.array(fc.double({ noNaN: true, noDefaultInfinity: true }), {
                  minLength: nrows,
                  maxLength: nrows,
                }),
                { minLength: ncols, maxLength: ncols },
              )
              .map((cols) => {
                const obj: Record<string, number[]> = {};
                cols.forEach((c, i) => {
                  obj[`c${i}`] = c;
                });
                return { df: DataFrame.fromColumns(obj), nrows, ncols };
              }),
          ),
        ),
        ({ df, nrows, ncols }) => {
          const r = dataFramePctChange(df);
          return r.shape[0] === nrows && r.shape[1] === ncols;
        },
      ),
    );
  });

  it("periods=0 always yields all-NaN output", () => {
    fc.assert(
      fc.property(fc.array(fc.double({ noNaN: true }), { minLength: 0, maxLength: 20 }), (data) => {
        const s = new Series({ data });
        return pctChange(s, 0).values.every((v) => Number.isNaN(v));
      }),
    );
  });
});
