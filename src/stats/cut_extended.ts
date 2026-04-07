/**
 * Extended cut / qcut — adds `retbins` and `ordered` categorical support.
 *
 * This module extends the basic {@link cut} and {@link qcut} with two
 * additional pandas-parity features:
 *
 * ### `retbins`
 * When you need the computed bin edges alongside the binned result, use
 * {@link cutWithBins} or {@link qcutWithBins}.  They return an
 * `{ result, bins }` object instead of a plain `Series`.
 *
 * ### Ordered categorical bins
 * {@link cutOrdered} and {@link qcutOrdered} return an
 * {@link OrderedCutResult} that carries the ordered list of category labels.
 * This mirrors pandas' `CategoricalDtype(ordered=True)` semantics: you know
 * the natural left-to-right ordering of the bin labels, and can use
 * {@link compareCategories} to do order-aware comparisons.
 *
 * @example
 * ```ts
 * import { cutWithBins, cutOrdered, compareCategories } from "tsb";
 *
 * const { result, bins } = cutWithBins([1, 2, 3, 4, 5], 2);
 * // result: Series ["(0.995, 3.0]", …]
 * // bins:   [0.995, 3.0, 5.005]
 *
 * const { result: r2, categories } = cutOrdered([1, 2, 3, 4, 5], [0, 3, 6], {
 *   labels: ["low", "high"],
 * });
 * compareCategories("low", "high", categories); // -1 (low < high)
 * ```
 *
 * @module
 */

import { IntervalIndex, Series } from "../core/index.ts";
import type { IntervalClosed } from "../core/index.ts";
import { Index } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── helpers (duplicated from cut.ts to keep this module self-contained) ──

function extractNums(x: readonly Scalar[] | Series<Scalar>): readonly number[] {
  const raw: readonly Scalar[] = x instanceof Series ? (x.values as readonly Scalar[]) : x;
  return raw.map((v): number => {
    if (typeof v === "number" && Number.isFinite(v)) {
      return v;
    }
    return Number.NaN;
  });
}

function extractIndex(x: readonly Scalar[] | Series<Scalar>, len: number): Index<Label> {
  if (x instanceof Series) {
    return x.index as Index<Label>;
  }
  return new Index<Label>(Array.from({ length: len }, (_, i): Label => i));
}

function extractName(x: readonly Scalar[] | Series<Scalar>): string | null {
  return x instanceof Series ? x.name : null;
}

function finiteRange(nums: readonly number[]): { lo: number; hi: number } {
  let lo = Number.POSITIVE_INFINITY;
  let hi = Number.NEGATIVE_INFINITY;
  for (const v of nums) {
    if (Number.isFinite(v)) {
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  }
  if (!Number.isFinite(lo)) throw new RangeError("cutWithBins: no finite values in input");
  if (lo === hi)
    throw new RangeError(
      `cutWithBins: all values are equal (${lo}); cannot compute bin width`,
    );
  return { lo, hi };
}

function equalWidthEdges(nums: readonly number[], n: number): readonly number[] {
  if (n < 1) throw new RangeError(`cutWithBins: bins must be ≥ 1, got ${n}`);
  const { lo, hi } = finiteRange(nums);
  const pad = (hi - lo) * 0.001;
  const step = (hi - lo) / n;
  const edges: number[] = [lo - pad];
  for (let i = 1; i < n; i++) edges.push(lo + step * i);
  edges.push(hi + pad);
  return edges;
}

function deduplicateEdges(
  edges: readonly number[],
  duplicates: "raise" | "drop",
): readonly number[] {
  const seen = new Set<number>();
  const result: number[] = [];
  for (const e of edges) {
    if (seen.has(e)) {
      if (duplicates === "raise") {
        throw new RangeError(
          `cutWithBins: duplicate bin edge ${e}. Pass duplicates="drop" to ignore.`,
        );
      }
    } else {
      seen.add(e);
      result.push(e);
    }
  }
  return result;
}

function buildIntervalIndex(edges: readonly number[], right: boolean): IntervalIndex {
  const closed: IntervalClosed = right ? "right" : "left";
  return IntervalIndex.fromBreaks(edges, closed);
}

function assignBins(
  nums: readonly number[],
  idx: IntervalIndex,
  includeLowest: boolean,
  right: boolean,
): readonly number[] {
  return nums.map((v): number => {
    if (!Number.isFinite(v)) return -1;
    const loc = idx.get_loc(v);
    if (loc !== -1) return loc;
    if (includeLowest && right && idx.size > 0 && v === (idx.left[0] as number)) return 0;
    if (!right && idx.size > 0 && v === (idx.right[idx.size - 1] as number))
      return idx.size - 1;
    return -1;
  });
}

function resolveLabels(
  assignments: readonly number[],
  idx: IntervalIndex,
  labels: readonly string[] | false | undefined,
): readonly Scalar[] {
  if (labels === false) {
    return assignments.map((bin): Scalar => (bin === -1 ? null : bin));
  }
  if (labels !== undefined) {
    if (labels.length !== idx.size) {
      throw new RangeError(
        `cutWithBins: labels length (${labels.length}) must equal number of bins (${idx.size})`,
      );
    }
    return assignments.map((bin): Scalar => (bin === -1 ? null : (labels[bin] as string)));
  }
  return assignments.map((bin): Scalar => (bin === -1 ? null : idx.at(bin).toString()));
}

/** Build category list (ordered, null excluded) from labels + IntervalIndex. */
function buildCategories(
  idx: IntervalIndex,
  labels: readonly string[] | false | undefined,
): readonly string[] {
  if (labels === false) {
    return Array.from({ length: idx.size }, (_, i) => String(i));
  }
  if (labels !== undefined) {
    return [...labels];
  }
  return Array.from({ length: idx.size }, (_, i) => idx.at(i).toString());
}

function quantileAt(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return Number.NaN;
  const pos = p * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo] as number;
  return (
    (sorted[lo] as number) +
    ((sorted[hi] as number) - (sorted[lo] as number)) * (pos - lo)
  );
}

function buildQuantileEdges(
  sorted: readonly number[],
  q: number | readonly number[],
): readonly number[] {
  if (typeof q === "number") {
    if (q < 2) throw new RangeError(`qcutWithBins: q must be ≥ 2, got ${q}`);
    return Array.from({ length: q + 1 }, (_, i): number => quantileAt(sorted, i / q));
  }
  if (q.length < 2) throw new RangeError("qcutWithBins: q array must have at least 2 elements");
  return q.map((p): number => quantileAt(sorted, p));
}

// ─── result types ─────────────────────────────────────────────────────────

/**
 * Return type for {@link cutWithBins} and {@link qcutWithBins}.
 * Contains the binned Series and the computed bin edges.
 */
export interface CutBinsResult {
  /** The binned result Series (same as `cut()` / `qcut()`). */
  readonly result: Series<Scalar>;
  /** The bin edges that were used (length = number of bins + 1). */
  readonly bins: readonly number[];
}

/**
 * Return type for {@link cutOrdered} and {@link qcutOrdered}.
 * Contains the binned Series, the ordered category list, and the edges.
 */
export interface OrderedCutResult {
  /** The binned result Series. */
  readonly result: Series<Scalar>;
  /**
   * The ordered category labels (smallest → largest bin).
   * `null` values in `result` are not listed here.
   */
  readonly categories: readonly string[];
  /** Whether the categories are treated as ordered. Always `true`. */
  readonly ordered: true;
  /** The bin edges used. */
  readonly bins: readonly number[];
}

// ─── option types ─────────────────────────────────────────────────────────

/** Options for {@link cutWithBins}. */
export interface CutWithBinsOptions {
  /** Right-closed `(a, b]` when `true` (default). */
  readonly right?: boolean;
  /**
   * Labels to use for bins.
   * - `undefined` (default): interval strings.
   * - `false`: integer codes.
   * - `string[]`: custom label per bin.
   */
  readonly labels?: readonly string[] | false;
  /** Include leftmost edge in the first bin when `right=true`. Default `false`. */
  readonly includeLowest?: boolean;
  /** How to handle duplicate bin edges. Default `"raise"`. */
  readonly duplicates?: "raise" | "drop";
}

/** Options for {@link qcutWithBins}. */
export interface QCutWithBinsOptions {
  /** Same as {@link CutWithBinsOptions.labels}. */
  readonly labels?: readonly string[] | false;
  /** How to handle duplicate quantile edges. Default `"raise"`. */
  readonly duplicates?: "raise" | "drop";
}

/** Options for {@link cutOrdered}. */
export interface CutOrderedOptions extends CutWithBinsOptions {}

/** Options for {@link qcutOrdered}. */
export interface QCutOrderedOptions extends QCutWithBinsOptions {}

// ─── internal shared core ─────────────────────────────────────────────────

interface CutCoreResult {
  series: Series<Scalar>;
  bins: readonly number[];
  categories: readonly string[];
}

function cutCoreEx(
  nums: readonly number[],
  edges: readonly number[],
  inputIndex: Index<Label>,
  name: string | null,
  right: boolean,
  labels: readonly string[] | false | undefined,
  includeLowest: boolean,
): CutCoreResult {
  const idx = buildIntervalIndex(edges, right);
  const assignments = assignBins(nums, idx, includeLowest, right);
  const data = resolveLabels(assignments, idx, labels);
  const series = new Series<Scalar>({ data, index: inputIndex, name });
  const categories = buildCategories(idx, labels);
  return { series, bins: edges, categories };
}

// ─── public: retbins variants ─────────────────────────────────────────────

/**
 * Bin values into discrete intervals, returning both the result Series
 * and the computed bin edges.
 *
 * Mirrors `pandas.cut(x, bins, retbins=True)`.
 *
 * @example
 * ```ts
 * const { result, bins } = cutWithBins([1, 2, 3, 4, 5], 2);
 * // result: Series with bin labels
 * // bins:   [0.995, 3.0, 5.005]
 *
 * const { result: r2, bins: b2 } = cutWithBins([1, 2, 3], [0, 2, 4], {
 *   labels: ["low", "high"],
 * });
 * ```
 */
export function cutWithBins(
  x: readonly Scalar[] | Series<Scalar>,
  bins: number | readonly number[],
  options?: CutWithBinsOptions,
): CutBinsResult {
  const right = options?.right ?? true;
  const labels = options?.labels;
  const includeLowest = options?.includeLowest ?? false;
  const duplicates = options?.duplicates ?? "raise";

  const nums = extractNums(x);
  const inputIndex = extractIndex(x, nums.length);
  const name = extractName(x);

  let edges: readonly number[];
  if (typeof bins === "number") {
    edges = equalWidthEdges(nums, bins);
  } else {
    if (bins.length < 2) {
      throw new RangeError("cutWithBins: bins array must have at least 2 elements");
    }
    edges = deduplicateEdges([...bins], duplicates);
  }

  const { series, bins: finalEdges } = cutCoreEx(
    nums,
    edges,
    inputIndex,
    name,
    right,
    labels,
    includeLowest,
  );
  return { result: series, bins: finalEdges };
}

/**
 * Quantile-based binning, returning both the result Series and the computed
 * bin edges.
 *
 * Mirrors `pandas.qcut(x, q, retbins=True)`.
 *
 * @example
 * ```ts
 * const { result, bins } = qcutWithBins([1, 2, 3, 4, 5], 4);
 * // result: Series with quartile labels
 * // bins:   [1.0, 2.0, 3.0, 4.0, 5.0]
 * ```
 */
export function qcutWithBins(
  x: readonly Scalar[] | Series<Scalar>,
  q: number | readonly number[],
  options?: QCutWithBinsOptions,
): CutBinsResult {
  const labels = options?.labels;
  const duplicates = options?.duplicates ?? "raise";

  const nums = extractNums(x);
  const inputIndex = extractIndex(x, nums.length);
  const name = extractName(x);

  const finiteNums = nums.filter((v): v is number => Number.isFinite(v));
  if (finiteNums.length === 0) {
    throw new RangeError("qcutWithBins: no finite values in input");
  }
  const sorted = [...finiteNums].sort((a, b): number => a - b);
  const rawEdges = buildQuantileEdges(sorted, q);
  const edges = deduplicateEdges(rawEdges, duplicates);

  const { series, bins } = cutCoreEx(nums, edges, inputIndex, name, true, labels, true);
  return { result: series, bins };
}

// ─── public: ordered categorical variants ─────────────────────────────────

/**
 * Bin values and return an {@link OrderedCutResult} that carries the ordered
 * list of category labels.
 *
 * This mirrors `pandas.cut()` with `ordered=True` on the returned
 * `CategoricalDtype`.  The `categories` array is sorted from smallest to
 * largest bin and can be used with {@link compareCategories} for
 * order-aware comparisons.
 *
 * @example
 * ```ts
 * const { result, categories } = cutOrdered(
 *   [1, 2, 3, 4, 5],
 *   [0, 3, 6],
 *   { labels: ["low", "high"] },
 * );
 * categories; // ["low", "high"]
 * compareCategories("low", "high", categories); // -1  (low < high)
 * ```
 */
export function cutOrdered(
  x: readonly Scalar[] | Series<Scalar>,
  bins: number | readonly number[],
  options?: CutOrderedOptions,
): OrderedCutResult {
  const right = options?.right ?? true;
  const labels = options?.labels;
  const includeLowest = options?.includeLowest ?? false;
  const duplicates = options?.duplicates ?? "raise";

  const nums = extractNums(x);
  const inputIndex = extractIndex(x, nums.length);
  const name = extractName(x);

  let edges: readonly number[];
  if (typeof bins === "number") {
    edges = equalWidthEdges(nums, bins);
  } else {
    if (bins.length < 2) {
      throw new RangeError("cutOrdered: bins array must have at least 2 elements");
    }
    edges = deduplicateEdges([...bins], duplicates);
  }

  const { series, bins: finalEdges, categories } = cutCoreEx(
    nums,
    edges,
    inputIndex,
    name,
    right,
    labels,
    includeLowest,
  );
  return { result: series, categories, ordered: true, bins: finalEdges };
}

/**
 * Quantile-based binning with ordered categorical result.
 *
 * Mirrors `pandas.qcut()` with `ordered=True`.
 *
 * @example
 * ```ts
 * const { result, categories } = qcutOrdered([1, 2, 3, 4, 5], 2);
 * categories; // ["(0.999, 3.0]", "(3.0, 5.0]"]
 * ```
 */
export function qcutOrdered(
  x: readonly Scalar[] | Series<Scalar>,
  q: number | readonly number[],
  options?: QCutOrderedOptions,
): OrderedCutResult {
  const labels = options?.labels;
  const duplicates = options?.duplicates ?? "raise";

  const nums = extractNums(x);
  const inputIndex = extractIndex(x, nums.length);
  const name = extractName(x);

  const finiteNums = nums.filter((v): v is number => Number.isFinite(v));
  if (finiteNums.length === 0) {
    throw new RangeError("qcutOrdered: no finite values in input");
  }
  const sorted = [...finiteNums].sort((a, b): number => a - b);
  const rawEdges = buildQuantileEdges(sorted, q);
  const edges = deduplicateEdges(rawEdges, duplicates);

  const { series, bins, categories } = cutCoreEx(
    nums,
    edges,
    inputIndex,
    name,
    true,
    labels,
    true,
  );
  return { result: series, categories, ordered: true, bins };
}

// ─── utility: category comparison ─────────────────────────────────────────

/**
 * Compare two bin labels according to their order in `categories`.
 *
 * Returns a negative number if `a` comes before `b`, zero if equal, and a
 * positive number if `a` comes after `b` — following the same convention as
 * `Array.prototype.sort`.  Treats `null` as less than any category (placed
 * first when sorting ascending).
 *
 * @example
 * ```ts
 * const { categories } = cutOrdered([1,2,3,4,5], [0,3,6], {
 *   labels: ["low", "high"],
 * });
 * compareCategories("low", "high", categories);  // -1
 * compareCategories("high", "low", categories);  // 1
 * compareCategories("low", "low", categories);   // 0
 * ```
 */
export function compareCategories(
  a: string | null,
  b: string | null,
  categories: readonly string[],
): number {
  if (a === b) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  const ia = categories.indexOf(a);
  const ib = categories.indexOf(b);
  // Unknown labels sort after known ones.
  const ra = ia === -1 ? categories.length : ia;
  const rb = ib === -1 ? categories.length : ib;
  return ra - rb;
}

/**
 * Sort a Series of bin labels by their categorical order.
 *
 * @param series - A Series produced by {@link cutOrdered} or {@link qcutOrdered}.
 * @param categories - The ordered category list from {@link OrderedCutResult}.
 * @param ascending - Sort direction. Default `true`.
 * @returns A new Series with values sorted by category order.
 *
 * @example
 * ```ts
 * const { result, categories } = cutOrdered([3, 1, 4, 1, 5], [0, 2, 4, 6], {
 *   labels: ["low", "mid", "high"],
 * });
 * const sorted = sortByCategory(result, categories);
 * ```
 */
export function sortByCategory(
  series: Series<Scalar>,
  categories: readonly string[],
  ascending = true,
): Series<Scalar> {
  const values = series.values as readonly Scalar[];
  const indices = Array.from({ length: values.length }, (_, i) => i);
  indices.sort((ia, ib): number => {
    const va = values[ia] as string | null;
    const vb = values[ib] as string | null;
    const cmp = compareCategories(va, vb, categories);
    return ascending ? cmp : -cmp;
  });

  const sortedData: Scalar[] = indices.map((i) => values[i] as Scalar);
  const sortedIndex: Label[] = indices.map((i) => series.index.at(i) as Label);
  return new Series<Scalar>({ data: sortedData, index: new Index<Label>(sortedIndex), name: series.name });
}
