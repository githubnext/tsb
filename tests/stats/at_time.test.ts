/**
 * Tests for at_time / between_time — atTimeSeries, atTimeDataFrame,
 * betweenTimeSeries, betweenTimeDataFrame.
 *
 * Reference values were generated independently with pandas 2.2.3:
 * ```py
 * idx = pd.date_range('2024-01-01', periods=8, freq='3h')
 * s = pd.Series(range(8), index=idx)
 * s.at_time('06:00')                              # [2]
 * s.between_time('09:00', '18:00')                # [3, 4, 5, 6]
 * s.between_time('09:00', '18:00', inclusive='left')    # [3, 4, 5]
 * s.between_time('09:00', '18:00', inclusive='right')   # [4, 5, 6]
 * s.between_time('09:00', '18:00', inclusive='neither') # [4, 5]
 * s.between_time('18:00', '03:00')                # [0, 1, 6, 7]  (wraparound)
 * ```
 *
 * Covers:
 * - atTimeSeries / atTimeDataFrame: exact time-of-day match
 * - betweenTimeSeries / betweenTimeDataFrame: window match, all inclusive modes
 * - Wraparound windows (start > end)
 * - Errors on non-DatetimeIndex, matching pandas' `TypeError: Index must be DatetimeIndex`
 * - Property-based: every returned row's time-of-day satisfies the predicate
 */

import { describe, expect, test } from "bun:test";
import * as fc from "fast-check";
import {
  DataFrame,
  Series,
  atTimeDataFrame,
  atTimeSeries,
  betweenTimeDataFrame,
  betweenTimeSeries,
} from "../../src/index.ts";
import type { Scalar } from "../../src/index.ts";

// Eight timestamps, 3 hours apart, starting 2024-01-01T00:00:00Z.
function hourlyIndex(): Date[] {
  const base = new Date("2024-01-01T00:00:00Z").getTime();
  return Array.from({ length: 8 }, (_, i) => new Date(base + i * 3 * 60 * 60 * 1000));
}

describe("atTimeSeries", () => {
  test("selects the single row matching the time of day (pandas: [2])", () => {
    const s = new Series<Scalar>({ data: [0, 1, 2, 3, 4, 5, 6, 7], index: hourlyIndex() });
    const result = atTimeSeries(s, "06:00");
    expect(result.values).toEqual([2]);
  });

  test("returns empty Series when no row matches", () => {
    const s = new Series<Scalar>({ data: [0, 1, 2], index: hourlyIndex().slice(0, 3) });
    const result = atTimeSeries(s, "05:00");
    expect(result.values).toEqual([]);
  });

  test("throws TypeError on a non-DatetimeIndex, matching pandas' error text", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3], index: [0, 1, 2] });
    expect(() => atTimeSeries(s, "00:00")).toThrow("Index must be DatetimeIndex");
  });

  test("accepts HH:MM:SS format", () => {
    const s = new Series<Scalar>({ data: [0, 1], index: hourlyIndex().slice(0, 2) });
    expect(atTimeSeries(s, "03:00:00").values).toEqual([1]);
  });
});

describe("atTimeDataFrame", () => {
  test("selects rows matching the time of day across all columns", () => {
    const df = DataFrame.fromColumns(
      { a: [0, 1, 2, 3, 4, 5, 6, 7], b: [8, 9, 10, 11, 12, 13, 14, 15] },
      { index: hourlyIndex() },
    );
    const result = atTimeDataFrame(df, "06:00");
    expect(result.col("a").values).toEqual([2]);
    expect(result.col("b").values).toEqual([10]);
  });

  test("throws TypeError on a non-DatetimeIndex", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    expect(() => atTimeDataFrame(df, "00:00")).toThrow("Index must be DatetimeIndex");
  });
});

describe("betweenTimeSeries", () => {
  const data = [0, 1, 2, 3, 4, 5, 6, 7];

  test("inclusive 'both' (default): pandas [3, 4, 5, 6]", () => {
    const s = new Series<Scalar>({ data, index: hourlyIndex() });
    expect(betweenTimeSeries(s, "09:00", "18:00").values).toEqual([3, 4, 5, 6]);
  });

  test("inclusive 'left': pandas [3, 4, 5]", () => {
    const s = new Series<Scalar>({ data, index: hourlyIndex() });
    expect(betweenTimeSeries(s, "09:00", "18:00", "left").values).toEqual([3, 4, 5]);
  });

  test("inclusive 'right': pandas [4, 5, 6]", () => {
    const s = new Series<Scalar>({ data, index: hourlyIndex() });
    expect(betweenTimeSeries(s, "09:00", "18:00", "right").values).toEqual([4, 5, 6]);
  });

  test("inclusive 'neither': pandas [4, 5]", () => {
    const s = new Series<Scalar>({ data, index: hourlyIndex() });
    expect(betweenTimeSeries(s, "09:00", "18:00", "neither").values).toEqual([4, 5]);
  });

  test("wraparound window (start > end): pandas [0, 1, 6, 7]", () => {
    const s = new Series<Scalar>({ data, index: hourlyIndex() });
    expect(betweenTimeSeries(s, "18:00", "03:00").values).toEqual([0, 1, 6, 7]);
  });

  test("throws TypeError on a non-DatetimeIndex", () => {
    const s = new Series<Scalar>({ data: [1, 2, 3], index: [0, 1, 2] });
    expect(() => betweenTimeSeries(s, "00:00", "12:00")).toThrow("Index must be DatetimeIndex");
  });
});

describe("betweenTimeDataFrame", () => {
  test("filters rows across all columns: pandas a=[3, 4, 5, 6]", () => {
    const df = DataFrame.fromColumns(
      { a: [0, 1, 2, 3, 4, 5, 6, 7], b: [8, 9, 10, 11, 12, 13, 14, 15] },
      { index: hourlyIndex() },
    );
    const result = betweenTimeDataFrame(df, "09:00", "18:00");
    expect(result.col("a").values).toEqual([3, 4, 5, 6]);
    expect(result.col("b").values).toEqual([11, 12, 13, 14]);
  });

  test("throws TypeError on a non-DatetimeIndex", () => {
    const df = DataFrame.fromColumns({ a: [1, 2, 3] });
    expect(() => betweenTimeDataFrame(df, "00:00", "12:00")).toThrow("Index must be DatetimeIndex");
  });
});

// ─── property-based ────────────────────────────────────────────────────────────

describe("property: betweenTimeSeries", () => {
  test("every returned row's time-of-day is within [start, end] (non-wraparound)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 22 }),
        fc.integer({ min: 0, max: 22 }),
        (startHour, spanHours) => {
          const endHour = Math.min(23, startHour + spanHours);
          fc.pre(startHour <= endHour);
          const index = hourlyIndex();
          const s = new Series<Scalar>({ data: index.map((_, i) => i), index });
          const start = `${String(startHour).padStart(2, "0")}:00`;
          const end = `${String(endHour).padStart(2, "0")}:00`;
          const result = betweenTimeSeries(s, start, end);
          for (const label of result.index.values) {
            const d = label as unknown as Date;
            const hour = d.getUTCHours();
            expect(hour >= startHour && hour <= endHour).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
