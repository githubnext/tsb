/**
 * GroupBy — split-apply-combine operations on Series and DataFrame.
 *
 * Mirrors `pandas.core.groupby`: groups rows by one or more key columns (or a
 * key Series), then applies aggregation or transformation functions to each
 * group, and combines results into a new Series or DataFrame.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({
 *   team:  ["A", "B", "A", "B", "A"],
 *   score: [10, 20, 30, 40, 50],
 * });
 * const gb = groupBy(df, "team");
 * gb.sum();
 * // DataFrame: team=A → score=90, team=B → score=60
 * ```
 */

import { DataFrame, Index, Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when the value should be treated as missing. */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

/** Numeric values from a series, excluding missing. */
function numericVals(s: Series<Scalar>): number[] {
  return s.toArray().filter((v): v is number => typeof v === "number" && !isMissing(v));
}

/** Sum of an array of numbers. */
function arraySum(nums: readonly number[]): number {
  return nums.reduce((acc, v) => acc + v, 0);
}

/** Mean of an array of numbers; NaN for empty. */
function arrayMean(nums: readonly number[]): number {
  if (nums.length === 0) {
    return Number.NaN;
  }
  return arraySum(nums) / nums.length;
}

/** Sample std-dev (ddof=1); NaN for < 2 values. */
function arrayStd(nums: readonly number[]): number {
  if (nums.length < 2) {
    return Number.NaN;
  }
  const m = arrayMean(nums);
  return Math.sqrt(nums.reduce((acc, v) => acc + (v - m) ** 2, 0) / (nums.length - 1));
}

/** Sample variance (ddof=1); NaN for < 2 values. */
function arrayVar(nums: readonly number[]): number {
  if (nums.length < 2) {
    return Number.NaN;
  }
  const m = arrayMean(nums);
  return nums.reduce((acc, v) => acc + (v - m) ** 2, 0) / (nums.length - 1);
}

/** Minimum of an array; undefined for empty. */
function arrayMin(arr: readonly Scalar[]): Scalar {
  const nonNull = arr.filter((v) => !isMissing(v));
  if (nonNull.length === 0) {
    return null;
  }
  return nonNull.reduce((a, b) => {
    const av = a as number | string | boolean;
    const bv = b as number | string | boolean;
    return av < bv ? av : bv;
  });
}

/** Maximum of an array; null for empty. */
function arrayMax(arr: readonly Scalar[]): Scalar {
  const nonNull = arr.filter((v) => !isMissing(v));
  if (nonNull.length === 0) {
    return null;
  }
  return nonNull.reduce((a, b) => {
    const av = a as number | string | boolean;
    const bv = b as number | string | boolean;
    return av > bv ? av : bv;
  });
}

/** Median of a numeric array; NaN for empty. */
function arrayMedian(nums: readonly number[]): number {
  if (nums.length === 0) {
    return Number.NaN;
  }
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid] ?? Number.NaN;
  }
  const lo = sorted[mid - 1] ?? Number.NaN;
  const hi = sorted[mid] ?? Number.NaN;
  return (lo + hi) / 2;
}

/** Build a composite string key from an array of scalars. */
function makeKey(vals: readonly Scalar[]): string {
  return vals.map((v) => (v === null || v === undefined ? "__null__" : String(v))).join("\x00");
}

// ─── GroupMapping ─────────────────────────────────────────────────────────────

/** Maps each group key string → sorted row positions. */
type GroupMapping = ReadonlyMap<string, readonly number[]>;

/** Group key as an array of label values (one per key column). */
type GroupKey = readonly Scalar[];

/** Build a GroupMapping from a DataFrame and key column names. */
function buildGroupMapping(df: DataFrame, keyNames: readonly string[]): GroupMapping {
  const keyCols = keyNames.map((k) => df.col(k).toArray());
  const map = new Map<string, number[]>();
  const n = df.shape[0];
  for (let i = 0; i < n; i++) {
    const key = makeKey(keyCols.map((col) => col[i] ?? null));
    const existing = map.get(key);
    if (existing !== undefined) {
      existing.push(i);
    } else {
      map.set(key, [i]);
    }
  }
  return map;
}

/** Parse a composite key string back into an array of scalars. */
function parseKey(key: string, ncols: number): GroupKey {
  const parts = key.split("\x00");
  return Array.from({ length: ncols }, (_, i) => {
    const p = parts[i] ?? "__null__";
    return p === "__null__" ? null : p;
  });
}

// ─── DataFrameGroupBy ─────────────────────────────────────────────────────────

/**
 * A grouped view of a DataFrame.
 *
 * Created by calling `groupBy(df, by)`.  Provides aggregation methods
 * (sum, mean, min, max, count, std, var, first, last, median) and
 * `apply` for custom aggregation.
 */
export class DataFrameGroupBy {
  private readonly _df: DataFrame;
  private readonly _keyNames: readonly string[];
  private readonly _mapping: GroupMapping;

  /** @internal */
  constructor(df: DataFrame, keyNames: readonly string[]) {
    this._df = df;
    this._keyNames = keyNames;
    this._mapping = buildGroupMapping(df, keyNames);
  }

  /** The column names used as group keys. */
  get keyNames(): readonly string[] {
    return this._keyNames;
  }

  /** Number of groups. */
  get ngroups(): number {
    return this._mapping.size;
  }

  /** The group keys (sorted by first appearance). */
  get groups(): ReadonlyMap<string, readonly number[]> {
    return this._mapping;
  }

  /** Return the group at the given key. */
  getGroup(keyVals: readonly Scalar[]): DataFrame {
    const key = makeKey(keyVals);
    const positions = this._mapping.get(key);
    if (positions === undefined) {
      throw new Error(`Group not found: ${keyVals.join(", ")}`);
    }
    return this._df.iloc(positions);
  }

  /** Iterate over (groupKey, subDataFrame) pairs. */
  *[Symbol.iterator](): Generator<[GroupKey, DataFrame]> {
    const ncols = this._keyNames.length;
    for (const [keyStr, positions] of this._mapping) {
      yield [parseKey(keyStr, ncols), this._df.iloc(positions)];
    }
  }

  // ─── aggregation helpers ──────────────────────────────────────────────────

  /** Apply an aggregation function to each non-key column of each group. */
  private _agg(aggFn: (col: Series<Scalar>, groupDf: DataFrame) => Scalar): DataFrame {
    const ncols = this._keyNames.length;
    const valueCols = this._df.columns.toArray().filter((c) => !this._keyNames.includes(c));

    // Accumulators: one array per column (key + value cols).
    const keyAccumulators: Scalar[][] = Array.from({ length: ncols }, () => []);
    const valAccumulators: Map<string, Scalar[]> = new Map(valueCols.map((c) => [c, []]));

    for (const [keyStr, positions] of this._mapping) {
      const key = parseKey(keyStr, ncols);
      for (let ki = 0; ki < ncols; ki++) {
        keyAccumulators[ki]?.push(key[ki] ?? null);
      }
      const subDf = this._df.iloc(positions);
      for (const vc of valueCols) {
        const aggVal = aggFn(subDf.col(vc), subDf);
        valAccumulators.get(vc)?.push(aggVal);
      }
    }

    const keyLabels = this._keyNames.map((_, ki) => keyAccumulators[ki] ?? []);
    const keyIndex = new Index<Label>(
      keyLabels[0]?.map((v) => (v === null ? "__null__" : (v as Label))) ?? [],
    );

    const colMap = new Map<string, Series<Scalar>>();
    for (let ki = 0; ki < ncols; ki++) {
      const name = this._keyNames[ki] ?? String(ki);
      const vals = keyAccumulators[ki] ?? [];
      colMap.set(name, new Series({ data: vals as Scalar[], name, index: keyIndex }));
    }
    for (const vc of valueCols) {
      const vals = valAccumulators.get(vc) ?? [];
      colMap.set(vc, new Series({ data: vals, name: vc, index: keyIndex }));
    }

    return new DataFrame(colMap, keyIndex);
  }

  /** Sum of each numeric column per group. */
  sum(): DataFrame {
    return this._agg((col) => arraySum(numericVals(col)));
  }

  /** Mean of each numeric column per group. */
  mean(): DataFrame {
    return this._agg((col) => arrayMean(numericVals(col)));
  }

  /** Minimum of each column per group. */
  min(): DataFrame {
    return this._agg((col) => arrayMin(col.toArray()));
  }

  /** Maximum of each column per group. */
  max(): DataFrame {
    return this._agg((col) => arrayMax(col.toArray()));
  }

  /** Count of non-missing values per group. */
  count(): DataFrame {
    return this._agg((col) => col.count());
  }

  /** Sample standard deviation (ddof=1) per group. */
  std(): DataFrame {
    return this._agg((col) => arrayStd(numericVals(col)));
  }

  /** Sample variance (ddof=1) per group. */
  var(): DataFrame {
    return this._agg((col) => arrayVar(numericVals(col)));
  }

  /** Median of each numeric column per group. */
  median(): DataFrame {
    return this._agg((col) => arrayMedian(numericVals(col)));
  }

  /** First non-missing value of each column per group. */
  first(): DataFrame {
    return this._agg((col) => {
      const vals = col.toArray();
      return vals.find((v) => !isMissing(v)) ?? null;
    });
  }

  /** Last non-missing value of each column per group. */
  last(): DataFrame {
    return this._agg((col) => {
      const vals = col.toArray();
      for (let i = vals.length - 1; i >= 0; i--) {
        if (!isMissing(vals[i] ?? null)) {
          return vals[i] ?? null;
        }
      }
      return null;
    });
  }

  /** Number of rows in each group as a Series. */
  size(): Series<Scalar> {
    const keys: Label[] = [];
    const sizes: number[] = [];
    const ncols = this._keyNames.length;
    for (const [keyStr, positions] of this._mapping) {
      const key = parseKey(keyStr, ncols);
      keys.push(key.join(", ") as Label);
      sizes.push(positions.length);
    }
    return new Series({ data: sizes, index: keys, name: "size" });
  }

  /**
   * Apply a custom aggregation function to each group.
   *
   * @param fn - Function receiving (subDataFrame, groupKey) and returning a
   *             Record<string, Scalar> (one value per output column).
   */
  apply(fn: (df: DataFrame, key: GroupKey) => Readonly<Record<string, Scalar>>): DataFrame {
    const ncols = this._keyNames.length;
    const allRows: Record<string, Scalar>[] = [];

    for (const [keyStr, positions] of this._mapping) {
      const key = parseKey(keyStr, ncols);
      const subDf = this._df.iloc(positions);
      const result = fn(subDf, key);
      const row: Record<string, Scalar> = {};
      for (let ki = 0; ki < ncols; ki++) {
        row[this._keyNames[ki] ?? String(ki)] = key[ki] ?? null;
      }
      for (const [col, val] of Object.entries(result)) {
        row[col] = val;
      }
      allRows.push(row);
    }

    if (allRows.length === 0) {
      return DataFrame.fromRecords([]);
    }
    return DataFrame.fromRecords(allRows);
  }

  /**
   * Transform each group with a function that returns a Series the same length
   * as the group, reassembling rows in original order.
   *
   * @param fn - Function receiving (Series column, groupDf) returning Series<Scalar>.
   */
  transform(fn: (col: Series<Scalar>, groupDf: DataFrame) => Series<Scalar>): DataFrame {
    const valueCols = this._df.columns.toArray().filter((c) => !this._keyNames.includes(c));
    const n = this._df.shape[0];

    const resultMap = new Map<string, Scalar[]>(valueCols.map((c) => [c, new Array<Scalar>(n)]));

    for (const [, positions] of this._mapping) {
      const subDf = this._df.iloc(positions);
      for (const vc of valueCols) {
        const transformed = fn(subDf.col(vc), subDf);
        const vals = transformed.toArray();
        const out = resultMap.get(vc) ?? [];
        for (let pi = 0; pi < positions.length; pi++) {
          const pos = positions[pi] ?? 0;
          out[pos] = vals[pi] ?? null;
        }
      }
    }

    const colMap = new Map<string, Series<Scalar>>();
    for (const kc of this._keyNames) {
      colMap.set(kc, this._df.col(kc));
    }
    for (const vc of valueCols) {
      const vals = resultMap.get(vc) ?? [];
      colMap.set(vc, new Series({ data: vals, name: vc, index: this._df.index }));
    }
    return new DataFrame(colMap, this._df.index);
  }
}

// ─── SeriesGroupBy ────────────────────────────────────────────────────────────

/**
 * A grouped view of a Series.
 *
 * Created by calling `groupBySeries(series, by)`.
 */
export class SeriesGroupBy {
  private readonly _series: Series<Scalar>;
  private readonly _by: Series<Scalar>;
  private readonly _mapping: GroupMapping;

  /** @internal */
  constructor(series: Series<Scalar>, by: Series<Scalar>) {
    if (series.size !== by.size) {
      throw new RangeError(
        `Series length (${series.size}) must match grouping key length (${by.size})`,
      );
    }
    this._series = series;
    this._by = by;
    const keysArr = by.toArray();
    const map = new Map<string, number[]>();
    for (let i = 0; i < keysArr.length; i++) {
      const k = makeKey([keysArr[i] ?? null]);
      const existing = map.get(k);
      if (existing !== undefined) {
        existing.push(i);
      } else {
        map.set(k, [i]);
      }
    }
    this._mapping = map;
  }

  /** Number of groups. */
  get ngroups(): number {
    return this._mapping.size;
  }

  /** Iterate over (groupKey, subSeries) pairs. */
  *[Symbol.iterator](): Generator<[Scalar, Series<Scalar>]> {
    for (const [keyStr, positions] of this._mapping) {
      const key = parseKey(keyStr, 1)[0] ?? null;
      yield [key, this._series.iloc(positions)];
    }
  }

  private _agg(fn: (s: Series<Scalar>) => Scalar): Series<Scalar> {
    const keys: Scalar[] = [];
    const vals: Scalar[] = [];
    for (const [keyStr, positions] of this._mapping) {
      const key = parseKey(keyStr, 1)[0] ?? null;
      keys.push(key);
      vals.push(fn(this._series.iloc(positions)));
    }
    const idx = new Index<Label>(keys.map((k) => (k === null ? "__null__" : (k as Label))));
    return new Series({ data: vals, index: idx, name: this._series.name });
  }

  /** Sum per group. */
  sum(): Series<Scalar> {
    return this._agg((s) => arraySum(numericVals(s)));
  }

  /** Mean per group. */
  mean(): Series<Scalar> {
    return this._agg((s) => arrayMean(numericVals(s)));
  }

  /** Min per group. */
  min(): Series<Scalar> {
    return this._agg((s) => arrayMin(s.toArray()));
  }

  /** Max per group. */
  max(): Series<Scalar> {
    return this._agg((s) => arrayMax(s.toArray()));
  }

  /** Count of non-missing values per group. */
  count(): Series<Scalar> {
    return this._agg((s) => s.count());
  }

  /** Standard deviation (ddof=1) per group. */
  std(): Series<Scalar> {
    return this._agg((s) => arrayStd(numericVals(s)));
  }

  /** Variance (ddof=1) per group. */
  var(): Series<Scalar> {
    return this._agg((s) => arrayVar(numericVals(s)));
  }

  /** Median per group. */
  median(): Series<Scalar> {
    return this._agg((s) => arrayMedian(numericVals(s)));
  }

  /** Size of each group. */
  size(): Series<Scalar> {
    const keys: Label[] = [];
    const sizes: number[] = [];
    for (const [keyStr, positions] of this._mapping) {
      const key = parseKey(keyStr, 1)[0] ?? null;
      keys.push(key === null ? "__null__" : (key as Label));
      sizes.push(positions.length);
    }
    return new Series({ data: sizes, index: keys, name: "size" });
  }
}

// ─── public factory functions ─────────────────────────────────────────────────

/**
 * Group a DataFrame by one or more columns.
 *
 * @param df - DataFrame to group.
 * @param by - Column name or array of column names to group by.
 * @returns A `DataFrameGroupBy` object.
 *
 * @example
 * ```ts
 * const g = groupBy(df, "team");
 * g.sum();   // one row per team, summing all numeric columns
 * ```
 */
export function groupBy(df: DataFrame, by: string | readonly string[]): DataFrameGroupBy {
  const keys = typeof by === "string" ? [by] : [...by];
  for (const k of keys) {
    if (!df.has(k)) {
      throw new Error(`Column "${k}" not found in DataFrame`);
    }
  }
  return new DataFrameGroupBy(df, keys);
}

/**
 * Group a Series by a key Series.
 *
 * @param series - Series to group.
 * @param by     - Series of group labels (same length as `series`).
 * @returns A `SeriesGroupBy` object.
 *
 * @example
 * ```ts
 * const s = new Series({ data: [10, 20, 30, 40], name: "vals" });
 * const k = new Series({ data: ["a", "b", "a", "b"], name: "key" });
 * groupBySeries(s, k).sum();  // a=40, b=60
 * ```
 */
export function groupBySeries(series: Series<Scalar>, by: Series<Scalar>): SeriesGroupBy {
  return new SeriesGroupBy(series, by);
}
