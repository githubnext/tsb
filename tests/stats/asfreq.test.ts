/**
 * Tests for asfreq — asfreqSeries, asfreqDataFrame.
 *
 * Reference values were generated independently with pandas 2.2.3:
 * ```py
 * idx = pd.date_range('2024-01-01', periods=3, freq='D')
 * s = pd.Series([1, 2, 3], index=idx, name='vals')
 *
 * s.asfreq('12h').values                    # [1.0, nan, 2.0, nan, 3.0]
 * s.asfreq('12h', method='ffill').values     # [1, 1, 2, 2, 3]
 * s.asfreq('12h', fill_value=-1).values      # [1, -1, 2, -1, 3]
 * s.asfreq('D').values                       # [1, 2, 3]  (unchanged)
 *
 * idx2 = pd.date_range('2024-01-01', periods=6, freq='D')
 * s2 = pd.Series(range(6), index=idx2)
 * s2.asfreq('2D').values                     # [0, 2, 4]  (downsample drops off-grid rows)
 *
 * df = pd.DataFrame({'a': [1, 2, 3], 'b': [10, 20, 30]}, index=idx)
 * df.asfreq('12h', method='ffill').to_dict('list')
 * # {'a': [1, 1, 2, 2, 3], 'b': [10, 10, 20, 20, 30]}
 *
 * idx3 = pd.date_range('2024-01-01 03:00', periods=2, freq='D')
 * s3 = pd.Series([1, 2], index=idx3)
 * s3.asfreq('D', normalize=True).index
 * # DatetimeIndex(['2024-01-01', '2024-01-02'])
 * ```
 *
 * Covers:
 * - Upsampling: no fill (null gaps), `method: "ffill"`, `fillValue`
 * - Same-frequency round-trip (no-op)
 * - Downsampling: rows not landing on the new grid are dropped
 * - `normalize` option
 * - DataFrame variant
 * - Errors on non-DatetimeIndex, matching pandas' `TypeError: Index must be DatetimeIndex`
 * - Property-based: every label in the result is a exact grid point at the requested freq
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import {
  DataFrame,
  Day,
  Hour,
  Series,
  asfreqDataFrame,
  asfreqSeries,
  date_range,
} from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

function threeDailyIndex(): Date[] {
  const base = new Date("2024-01-01T00:00:00Z").getTime();
  return Array.from({ length: 3 }, (_, i) => new Date(base + i * 24 * 60 * 60 * 1000));
}

describe("asfreqSeries", () => {
  test("upsampling with no fill introduces null gaps", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3], index: threeDailyIndex(), name: "vals" });
    const r = asfreqSeries(s, new Hour(12));
    expect(r.values).toEqual([1, null, 2, null, 3]);
    expect(r.name).toBe("vals");
    expect(r.index.size).toBe(5);
  });

  test("upsampling with method: ffill propagates forward", () => {
    const s = new Series<number>({ data: [1, 2, 3], index: threeDailyIndex() });
    const r = asfreqSeries(s, new Hour(12), { method: "ffill" });
    expect(r.values).toEqual([1, 1, 2, 2, 3]);
  });

  test("upsampling with fillValue uses the given scalar", () => {
    const s = new Series<number>({ data: [1, 2, 3], index: threeDailyIndex() });
    const r = asfreqSeries(s, new Hour(12), { fillValue: -1 });
    expect(r.values).toEqual([1, -1, 2, -1, 3]);
  });

  test("method takes precedence over fillValue when both given", () => {
    const s = new Series({ data: [1, 2], index: threeDailyIndex().slice(0, 2) });
    const r = asfreqSeries(s, new Hour(12), { method: "ffill", fillValue: -1 });
    expect(r.values).toEqual([1, 1, 2]);
  });

  test("same frequency is a no-op", () => {
    const s = new Series({ data: [1, 2, 3], index: threeDailyIndex() });
    const r = asfreqSeries(s, "D");
    expect(r.values).toEqual([1, 2, 3]);
    expect(r.index.toArray()).toEqual(threeDailyIndex());
  });

  test("downsampling drops rows that don't land on the new grid", () => {
    const base = new Date("2024-01-01T00:00:00Z").getTime();
    const idx = Array.from({ length: 6 }, (_, i) => new Date(base + i * 24 * 60 * 60 * 1000));
    const s = new Series({ data: [0, 1, 2, 3, 4, 5], index: idx });
    const r = asfreqSeries(s, new Day(2));
    expect(r.values).toEqual([0, 2, 4]);
  });

  test("normalize resets timestamps to midnight", () => {
    const base = new Date("2024-01-01T03:00:00Z").getTime();
    const idx = [new Date(base), new Date(base + 24 * 60 * 60 * 1000)];
    const s = new Series({ data: [1, 2], index: idx });
    const r = asfreqSeries(s, "D", { normalize: true });
    expect(r.values).toEqual([1, 2]);
    expect(r.index.toArray()).toEqual([
      new Date("2024-01-01T00:00:00Z"),
      new Date("2024-01-02T00:00:00Z"),
    ]);
  });

  test("empty series returns empty series", () => {
    const s = new Series({ data: [] as number[], index: [] as Date[] });
    const r = asfreqSeries(s, "D");
    expect(r.values).toEqual([]);
    expect(r.index.size).toBe(0);
  });

  test("throws TypeError on non-DatetimeIndex", () => {
    const s = new Series({ data: [1, 2, 3] });
    expect(() => asfreqSeries(s, "D")).toThrow(TypeError);
    expect(() => asfreqSeries(s, "D")).toThrow("Index must be DatetimeIndex");
  });
});

describe("asfreqDataFrame", () => {
  test("upsampling with method: ffill propagates every column forward", () => {
    const df = DataFrame.fromColumns(
      { a: [1, 2, 3], b: [10, 20, 30] },
      { index: threeDailyIndex() },
    );
    const r = asfreqDataFrame(df, new Hour(12), { method: "ffill" });
    expect(r.col("a").values).toEqual([1, 1, 2, 2, 3]);
    expect(r.col("b").values).toEqual([10, 10, 20, 20, 30]);
    expect(r.index.size).toBe(5);
  });

  test("upsampling with no fill introduces null gaps in every column", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] }, { index: threeDailyIndex() });
    const r = asfreqDataFrame(df, new Hour(12));
    expect(r.col("a").values).toEqual([1, null, 2, null, 3]);
  });

  test("throws TypeError on non-DatetimeIndex", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    expect(() => asfreqDataFrame(df, "D")).toThrow(TypeError);
    expect(() => asfreqDataFrame(df, "D")).toThrow("Index must be DatetimeIndex");
  });
});

// ─── property-based ────────────────────────────────────────────────────────────

describe("asfreqSeries — property-based", () => {
  test("every result label lands on the requested-frequency grid", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }),
        fc.integer({ min: 1, max: 6 }),
        (periods, hourStep) => {
          const idx = date_range({ start: "2024-01-01", periods, freq: "D" }).toArray();
          const s = new Series({ data: idx.map((_, i) => i), index: idx });
          const r = asfreqSeries(s, new Hour(hourStep));
          const startMs = idx[0]?.getTime() ?? 0;
          const stepMs = hourStep * 60 * 60 * 1000;
          for (const label of r.index.toArray()) {
            const d = label as Date;
            expect((d.getTime() - startMs) % stepMs).toBe(0);
          }
        },
      ),
    );
  });

  test("result length never exceeds a full regular grid over the span", () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 8 }), (periods) => {
        const idx = date_range({ start: "2024-01-01", periods, freq: "D" }).toArray();
        const s = new Series({ data: idx.map((_, i) => i), index: idx });
        const r = asfreqSeries(s, "D");
        expect(r.index.size).toBe(periods);
      }),
    );
  });
});
