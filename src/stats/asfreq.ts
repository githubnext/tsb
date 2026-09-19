/**
 * asfreq — convert a datetime-indexed Series or DataFrame to a specified
 * frequency.
 *
 * Mirrors `pandas.Series.asfreq` / `pandas.DataFrame.asfreq`.
 *
 * Unlike {@link resampleSeries} / {@link resampleDataFrame} (which group and
 * aggregate observations that fall into each new bin), `asfreq` simply
 * *reindexes* the object onto a regular `date_range` spanning its first and
 * last labels at the requested frequency — new timestamps introduced by
 * upsampling are `null` unless `method` or `fillValue` is supplied, and any
 * original timestamps that don't land on the new grid are dropped.
 *
 * Requires the index to consist entirely of `Date` labels (a "DatetimeIndex");
 * calling on a non-datetime index throws, matching pandas'
 * `TypeError: Index must be DatetimeIndex`.
 *
 * - {@link asfreqSeries}    — convert a Series to the new frequency
 * - {@link asfreqDataFrame} — convert a DataFrame's rows to the new frequency
 *
 * @example
 * ```ts
 * import { Hour, Series, asfreqSeries, date_range } from "tsb";
 *
 * const idx = date_range({ start: "2024-01-01", periods: 3, freq: "D" }).toArray();
 * const s = new Series({ data: [1, 2, 3], index: idx });
 * asfreqSeries(s, new Hour(12)).values; // [1, null, 2, null, 3]
 * asfreqSeries(s, new Hour(12), { method: "ffill" }).values; // [1, 1, 2, 2, 3]
 * ```
 *
 * @module
 */

import type {
  DateOffset,
  DateRangeFreq,
  ReindexDataFrameOptions,
  ReindexMethod,
  ReindexSeriesOptions,
} from "../core/index.ts";
import {
  DataFrame,
  Index,
  Series,
  date_range,
  reindexDataFrame,
  reindexSeries,
} from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** Options accepted by {@link asfreqSeries} and {@link asfreqDataFrame}. */
export interface AsfreqOptions {
  /**
   * Fill method for gaps introduced by upsampling.
   * - `"ffill"` / `"pad"` — propagate last valid observation forward.
   * - `"bfill"` / `"backfill"` — use the next valid observation.
   * - `"nearest"` — use the closest valid observation.
   *
   * Takes precedence over `fillValue` when both are supplied, matching pandas.
   */
  method?: ReindexMethod;
  /** Value to use for gaps introduced by upsampling when `method` is not given. */
  fillValue?: Scalar;
  /** Reset every timestamp on the new index to midnight. Defaults to `false`. */
  normalize?: boolean;
}

// ─── helpers ───────────────────────────────────────────────────────────────────

/** Assert that every label is a `Date`, throwing pandas' error text otherwise. */
function assertDatetimeLabels(labels: readonly Label[]): void {
  for (const label of labels) {
    if (!(label instanceof Date)) {
      throw new TypeError("Index must be DatetimeIndex");
    }
  }
}

/**
 * Build a `ReindexSeriesOptions` bag from `AsfreqOptions`, omitting `method`/
 * `fillValue` keys entirely when undefined (required under
 * `exactOptionalPropertyTypes`).
 */
function toReindexOptions(options: AsfreqOptions): ReindexSeriesOptions {
  const result: ReindexSeriesOptions = {};
  if (options.method !== undefined) {
    result.method = options.method;
  }
  if (options.fillValue !== undefined) {
    result.fillValue = options.fillValue;
  }
  return result;
}

/** Build the new regularly-spaced `Date[]` grid spanning `labels` at `freq`. */
function buildGrid(labels: readonly Label[], freq: DateRangeFreq | DateOffset): Date[] {
  if (labels.length === 0) {
    return [];
  }
  const dates = labels as readonly Date[];
  const start = dates.reduce((a, b) => (a <= b ? a : b));
  const end = dates.reduce((a, b) => (a >= b ? a : b));
  return date_range({ start, end, freq }).toArray();
}

/** Reset a `Date` to midnight UTC (mirrors `DatetimeIndex.normalize()`). */
function normalizeDate(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// ─── asfreqSeries ──────────────────────────────────────────────────────────────

/**
 * Convert a datetime-indexed Series to the specified frequency.
 *
 * Mirrors `pandas.Series.asfreq(freq, method=None, fill_value=None, normalize=False)`.
 *
 * @example
 * ```ts
 * const idx = date_range({ start: "2024-01-01", periods: 2, freq: "D" }).toArray();
 * const s = new Series({ data: [1, 2], index: idx });
 * asfreqSeries(s, new Hour(12)).values; // [1, null, 2]
 * ```
 */
export function asfreqSeries<T extends Scalar>(
  series: Series<T>,
  freq: DateRangeFreq | DateOffset,
  options: AsfreqOptions = {},
): Series<T> {
  const { normalize = false } = options;
  const labels = series.index.toArray();
  assertDatetimeLabels(labels);
  const grid = buildGrid(labels, freq);
  const result = reindexSeries(series, grid, toReindexOptions(options));
  if (!normalize) {
    return result;
  }
  const normalizedIndex = result.index.toArray().map((d) => normalizeDate(d as Date));
  return new Series<T>({ data: result.values as T[], index: normalizedIndex, name: result.name });
}

// ─── asfreqDataFrame ───────────────────────────────────────────────────────────

/**
 * Convert a datetime-indexed DataFrame's rows to the specified frequency.
 *
 * Mirrors `pandas.DataFrame.asfreq(freq, method=None, fill_value=None, normalize=False)`.
 *
 * @example
 * ```ts
 * const idx = date_range({ start: "2024-01-01", periods: 2, freq: "D" }).toArray();
 * const df = DataFrame.fromColumns({ a: [1, 2] }, { index: idx });
 * asfreqDataFrame(df, new Hour(12)).col("a").values; // [1, null, 2]
 * ```
 */
export function asfreqDataFrame(
  df: DataFrame,
  freq: DateRangeFreq | DateOffset,
  options: AsfreqOptions = {},
): DataFrame {
  const { normalize = false } = options;
  const labels = df.index.toArray();
  assertDatetimeLabels(labels);
  const grid = buildGrid(labels, freq);
  const reindexOptions: ReindexDataFrameOptions = { index: grid, ...toReindexOptions(options) };
  const result = reindexDataFrame(df, reindexOptions);
  if (!normalize) {
    return result;
  }
  const normalizedIndex = new Index<Label>(
    result.index.toArray().map((d) => normalizeDate(d as Date)),
    result.index.name,
  );
  const colMap = new Map<string, Series<Scalar>>();
  for (const name of result.columns.toArray()) {
    const col = result.col(name);
    colMap.set(
      name,
      new Series<Scalar>({ data: col.values, index: normalizedIndex, name: col.name }),
    );
  }
  return new DataFrame(colMap, normalizedIndex);
}
