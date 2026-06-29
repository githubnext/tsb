/**
 * core/sparse — SparseArray and SparseDtype.
 *
 * Mirrors `pandas.arrays.SparseArray` and `pandas.SparseDtype`.
 *
 * A {@link SparseArray} stores data efficiently when most values equal a
 * {@link SparseDtype.fill_value fill_value} (commonly `NaN` for floats or
 * `0` for integers). Only the **non-fill** values and their indices are stored;
 * the fill value is inferred for all other positions.
 *
 * @example
 * ```ts
 * import { SparseArray, SparseDtype } from "tsb";
 *
 * // Create a sparse array where most elements are 0
 * const arr = SparseArray.fromDense([1, 0, 0, 0, 2, 0, 0, 3], 0);
 * arr.length;      // 8
 * arr.npoints;     // 3  (only three non-zero values stored)
 * arr.density;     // 0.375
 * arr.sp_values;   // [1, 2, 3]
 * arr.sp_index;    // [0, 4, 7]
 * arr.toDense();   // [1, 0, 0, 0, 2, 0, 0, 3]
 *
 * // With NaN fill (the pandas default)
 * const a2 = SparseArray.fromDense([1, NaN, NaN, 4]);
 * a2.density;      // 0.5
 * ```
 *
 * @module
 */

// ─── SparseDtype ──────────────────────────────────────────────────────────────

/**
 * Dtype representing a sparse array backed by {@link SparseArray}.
 *
 * Mirrors `pandas.SparseDtype`. The dtype is parameterised by:
 * - `subtype` — the dtype of the stored values, e.g. `"float64"`, `"int64"`.
 * - `fill_value` — the implicit value for positions not stored. Defaults to
 *   `NaN` for float subtypes and `0` for integer subtypes.
 *
 * @example
 * ```ts
 * const dt = new SparseDtype("float64");
 * dt.name;        // "Sparse[float64]"
 * dt.fill_value;  // NaN
 *
 * const di = new SparseDtype("int64", 0);
 * di.name;        // "Sparse[int64, 0]"
 * di.fill_value;  // 0
 * ```
 */
export class SparseDtype {
  /** The element dtype, e.g. `"float64"` or `"int64"`. */
  readonly subtype: string;
  /** The implicit fill value for positions not stored. */
  readonly fill_value: number;

  /**
   * Create a SparseDtype.
   *
   * @param subtype - Underlying numeric dtype name. Defaults to `"float64"`.
   * @param fill_value - Implicit fill value. Defaults to `NaN` for float
   *   subtypes and `0` for integer subtypes.
   */
  constructor(subtype = "float64", fill_value?: number) {
    this.subtype = subtype;
    if (fill_value !== undefined) {
      this.fill_value = fill_value;
    } else {
      this.fill_value = SparseDtype._defaultFillValue(subtype);
    }
  }

  /** Returns the default fill value for a given subtype. */
  private static _defaultFillValue(subtype: string): number {
    if (subtype.startsWith("int") || subtype.startsWith("uint")) {
      return 0;
    }
    return Number.NaN;
  }

  /**
   * String representation, e.g. `"Sparse[float64]"` or
   * `"Sparse[int64, 0]"`.
   */
  get name(): string {
    const fv = this.fill_value;
    const isDefaultFill =
      (Number.isNaN(fv) && Number.isNaN(SparseDtype._defaultFillValue(this.subtype))) ||
      fv === SparseDtype._defaultFillValue(this.subtype);
    if (isDefaultFill) {
      return `Sparse[${this.subtype}]`;
    }
    return `Sparse[${this.subtype}, ${fv}]`;
  }

  /** @internal */
  toString(): string {
    return this.name;
  }
}

// ─── SparseArray ─────────────────────────────────────────────────────────────

/**
 * An array that stores data sparsely — only non-fill values and their
 * positions are held in memory.
 *
 * Mirrors `pandas.arrays.SparseArray`. Useful when a large fraction of
 * elements share a common value (the {@link fill_value}) such as `NaN`,
 * `0`, or `false`.
 *
 * @example
 * ```ts
 * import { SparseArray } from "tsb";
 *
 * const arr = SparseArray.fromDense([0, 0, 5, 0, 0, 3], 0);
 * arr.sp_values;   // [5, 3]
 * arr.sp_index;    // [2, 5]
 * arr.toDense();   // [0, 0, 5, 0, 0, 3]
 * arr.density;     // 0.333…
 * arr.sum();       // 8
 * ```
 */
export class SparseArray {
  private readonly _length: number;
  /** Positions (0-based) of the non-fill values. */
  private readonly _indices: Int32Array;
  /** The non-fill values, in position order. */
  private readonly _values: Float64Array;
  private readonly _fillValue: number;
  private readonly _dtype: SparseDtype;

  /** @internal — use {@link SparseArray.fromDense} or the constructor. */
  private constructor(
    length: number,
    indices: Int32Array,
    values: Float64Array,
    fillValue: number,
    subtype: string,
  ) {
    this._length = length;
    this._indices = indices;
    this._values = values;
    this._fillValue = fillValue;
    this._dtype = new SparseDtype(subtype, fillValue);
  }

  // ─── factory ───────────────────────────────────────────────────────────────

  /**
   * Create a {@link SparseArray} from a dense array of numbers.
   *
   * Values that satisfy `isFill(v, fill_value)` are **not** stored.  The
   * default fill equality uses `Object.is` so that `NaN === NaN` (i.e.
   * `NaN` is treated as equal to itself).
   *
   * @param data - Dense input array.  `NaN` and `null`/`undefined` are
   *   treated as `NaN` internally.
   * @param fill_value - The implicit fill value.  Defaults to `NaN`.
   * @param subtype - The element dtype label.  Defaults to `"float64"`.
   */
  static fromDense(
    data: readonly (number | null | undefined)[],
    fill_value = Number.NaN,
    subtype = "float64",
  ): SparseArray {
    const indList: number[] = [];
    const valList: number[] = [];

    for (let i = 0; i < data.length; i++) {
      const raw = data[i];
      const v = raw == null ? Number.NaN : raw;
      if (!SparseArray._isFill(v, fill_value)) {
        indList.push(i);
        valList.push(v);
      }
    }

    return new SparseArray(
      data.length,
      new Int32Array(indList),
      new Float64Array(valList),
      fill_value,
      subtype,
    );
  }

  /**
   * Create a {@link SparseArray} directly from sparse (COO) components.
   *
   * @param length - Total logical length of the array.
   * @param indices - Sorted positions of the non-fill values (0-based).
   * @param values - Non-fill values, one per index.
   * @param fill_value - Implicit fill value.  Defaults to `NaN`.
   * @param subtype - Element dtype label.  Defaults to `"float64"`.
   */
  static fromSparse(
    length: number,
    indices: readonly number[],
    values: readonly number[],
    fill_value = Number.NaN,
    subtype = "float64",
  ): SparseArray {
    if (indices.length !== values.length) {
      throw new RangeError(
        `indices.length (${indices.length}) must equal values.length (${values.length})`,
      );
    }
    return new SparseArray(
      length,
      new Int32Array(indices),
      new Float64Array(values),
      fill_value,
      subtype,
    );
  }

  /** Check whether `v` equals the fill value (NaN-safe). */
  private static _isFill(v: number, fill: number): boolean {
    return Object.is(v, fill);
  }

  // ─── properties ────────────────────────────────────────────────────────────

  /** Total logical length of the array (including fill positions). */
  get length(): number {
    return this._length;
  }

  /** Number of explicitly stored (non-fill) values. */
  get npoints(): number {
    return this._values.length;
  }

  /**
   * Fraction of positions that are stored (0.0 – 1.0).
   *
   * Lower density = more memory savings.
   */
  get density(): number {
    if (this._length === 0) {
      return 0;
    }
    return this._values.length / this._length;
  }

  /** The implicit fill value. */
  get fill_value(): number {
    return this._fillValue;
  }

  /**
   * The stored (non-fill) values in position order.
   *
   * Mirrors `pandas.arrays.SparseArray.sp_values`.
   */
  get sp_values(): number[] {
    return Array.from(this._values);
  }

  /**
   * The positions (0-based) of the stored values.
   *
   * Mirrors `pandas.arrays.SparseArray.sp_index`.
   */
  get sp_index(): number[] {
    return Array.from(this._indices);
  }

  /** The {@link SparseDtype} of this array. */
  get dtype(): SparseDtype {
    return this._dtype;
  }

  // ─── element access ────────────────────────────────────────────────────────

  /**
   * Return the value at position `i`.
   *
   * Returns the {@link fill_value} for positions not explicitly stored.
   *
   * @example
   * ```ts
   * const arr = SparseArray.fromDense([1, 0, 0, 4], 0);
   * arr.at(0);  // 1
   * arr.at(1);  // 0 (fill)
   * arr.at(3);  // 4
   * ```
   */
  at(i: number): number {
    if (i < 0 || i >= this._length) {
      throw new RangeError(`Index ${i} out of bounds for length ${this._length}`);
    }
    const pos = this._bsearch(i);
    if (pos >= 0) {
      return this._values[pos] ?? this._fillValue;
    }
    return this._fillValue;
  }

  /**
   * Binary search for position `idx` in `this._indices`.
   * Returns the array position if found, or -1 if not.
   */
  private _bsearch(idx: number): number {
    let lo = 0;
    let hi = this._indices.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      const v = this._indices[mid];
      if (v === undefined) {
        return -1;
      }
      if (v === idx) {
        return mid;
      }
      if (v < idx) {
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return -1;
  }

  // ─── conversion ────────────────────────────────────────────────────────────

  /**
   * Convert to a dense `number[]`, replacing fill positions with
   * {@link fill_value}.
   *
   * @example
   * ```ts
   * const arr = SparseArray.fromDense([1, 0, 0, 4], 0);
   * arr.toDense();  // [1, 0, 0, 4]
   * ```
   */
  toDense(): number[] {
    const out = new Array<number>(this._length).fill(this._fillValue);
    for (let k = 0; k < this._indices.length; k++) {
      const idx = this._indices[k];
      const val = this._values[k];
      if (idx !== undefined && val !== undefined) {
        out[idx] = val;
      }
    }
    return out;
  }

  /**
   * Return sparse COO (Coordinate) format representation.
   *
   * Returned object has `indices` (positions) and `values` (stored values).
   */
  toCoo(): { indices: number[]; values: number[] } {
    return { indices: this.sp_index, values: this.sp_values };
  }

  // ─── operations ────────────────────────────────────────────────────────────

  /**
   * Fill NaN values with `value` and return a new {@link SparseArray}.
   *
   * Only affects `NaN` positions in the dense view — positions already
   * storing a number are unchanged.
   *
   * @example
   * ```ts
   * const arr = SparseArray.fromDense([1, NaN, NaN, 4]);
   * arr.fillna(0).toDense();  // [1, 0, 0, 4]
   * ```
   */
  fillna(value: number): SparseArray {
    // If the fill_value is NaN, filling changes the fill_value to `value`
    if (Number.isNaN(this._fillValue)) {
      // Re-create with new fill_value; existing stored values stay
      return new SparseArray(
        this._length,
        new Int32Array(this._indices),
        new Float64Array(this._values),
        value,
        this._dtype.subtype,
      );
    }
    // fill_value is not NaN — nothing to fill (NaN must be in sp_values)
    const newIndices: number[] = [];
    const newValues: number[] = [];
    for (let k = 0; k < this._indices.length; k++) {
      const idx = this._indices[k];
      const v = this._values[k];
      if (idx === undefined || v === undefined) {
        continue;
      }
      if (Number.isNaN(v)) {
        // Don't store it if it equals new fill; otherwise store value
        if (value !== this._fillValue) {
          newIndices.push(idx);
          newValues.push(value);
        }
      } else {
        newIndices.push(idx);
        newValues.push(v);
      }
    }
    return new SparseArray(
      this._length,
      new Int32Array(newIndices),
      new Float64Array(newValues),
      this._fillValue,
      this._dtype.subtype,
    );
  }

  /**
   * Return a new {@link SparseArray} with a different fill value.
   *
   * Positions whose value equals the current fill are not stored; positions
   * whose value equals the new fill are removed from storage.
   */
  withFillValue(newFill: number): SparseArray {
    return SparseArray.fromDense(this.toDense(), newFill, this._dtype.subtype);
  }

  /**
   * Element-wise arithmetic: add a scalar.
   *
   * @example
   * ```ts
   * const arr = SparseArray.fromDense([1, 0, 0, 4], 0);
   * arr.add(10).toDense();  // [11, 10, 10, 14]
   * ```
   */
  add(scalar: number): SparseArray {
    const dense = this.toDense().map((v) => v + scalar);
    return SparseArray.fromDense(dense, this._fillValue + scalar, this._dtype.subtype);
  }

  /**
   * Element-wise arithmetic: multiply by a scalar.
   *
   * @example
   * ```ts
   * const arr = SparseArray.fromDense([1, 0, 0, 4], 0);
   * arr.mul(2).toDense();  // [2, 0, 0, 8]
   * ```
   */
  mul(scalar: number): SparseArray {
    const newFill = this._fillValue * scalar;
    const newIndices = new Int32Array(this._indices);
    const newValues = new Float64Array(this._values.length);
    for (let k = 0; k < this._values.length; k++) {
      const v = this._values[k];
      if (v !== undefined) {
        newValues[k] = v * scalar;
      }
    }
    return new SparseArray(this._length, newIndices, newValues, newFill, this._dtype.subtype);
  }

  // ─── aggregations ──────────────────────────────────────────────────────────

  /**
   * Sum of all values (treating NaN fill positions as 0, consistent with
   * `numpy.nansum` behaviour for sparse arrays).
   *
   * @example
   * ```ts
   * const arr = SparseArray.fromDense([1, NaN, NaN, 4]);
   * arr.sum();  // 5
   * ```
   */
  sum(): number {
    let total = 0;
    // Stored (non-fill) values
    for (const v of this._values) {
      if (!Number.isNaN(v)) {
        total += v;
      }
    }
    // Fill positions: if fill_value is a real number (not NaN), add it for
    // each fill position.
    if (!Number.isNaN(this._fillValue)) {
      const nFill = this._length - this._values.length;
      total += this._fillValue * nFill;
    }
    return total;
  }

  /**
   * Mean of all non-NaN values.
   *
   * @example
   * ```ts
   * const arr = SparseArray.fromDense([1, NaN, NaN, 3]);
   * arr.mean();  // 2  (mean of [1, 3])
   * ```
   */
  mean(): number {
    let total = 0;
    let count = 0;
    // Stored values
    for (const v of this._values) {
      if (!Number.isNaN(v)) {
        total += v;
        count++;
      }
    }
    // Fill positions (if fill_value is real)
    if (!Number.isNaN(this._fillValue)) {
      const nFill = this._length - this._values.length;
      total += this._fillValue * nFill;
      count += nFill;
    }
    if (count === 0) {
      return Number.NaN;
    }
    return total / count;
  }

  /**
   * Maximum value (ignoring NaN).  Returns `NaN` if all values are NaN.
   *
   * @example
   * ```ts
   * const arr = SparseArray.fromDense([1, 0, 0, 4], 0);
   * arr.max();  // 4
   * ```
   */
  max(): number {
    let result = Number.NaN;
    // Start from fill_value if it's real
    if (!Number.isNaN(this._fillValue) && this._length > this._values.length) {
      result = this._fillValue;
    }
    for (const v of this._values) {
      if (!Number.isNaN(v) && (Number.isNaN(result) || v > result)) {
        result = v;
      }
    }
    return result;
  }

  /**
   * Minimum value (ignoring NaN).  Returns `NaN` if all values are NaN.
   *
   * @example
   * ```ts
   * const arr = SparseArray.fromDense([1, 0, 0, 4], 0);
   * arr.min();  // 0
   * ```
   */
  min(): number {
    let result = Number.NaN;
    // Start from fill_value if it's real
    if (!Number.isNaN(this._fillValue) && this._length > this._values.length) {
      result = this._fillValue;
    }
    for (const v of this._values) {
      if (!Number.isNaN(v) && (Number.isNaN(result) || v < result)) {
        result = v;
      }
    }
    return result;
  }

  /**
   * Standard deviation of all non-NaN values (ddof=1 by default).
   *
   * @param ddof - Delta degrees of freedom.  Defaults to `1` (sample std).
   */
  std(ddof = 1): number {
    const dense = this.toDense().filter((v) => !Number.isNaN(v));
    if (dense.length <= ddof) {
      return Number.NaN;
    }
    const m = dense.reduce((a, b) => a + b, 0) / dense.length;
    const variance = dense.reduce((a, b) => a + (b - m) ** 2, 0) / (dense.length - ddof);
    return Math.sqrt(variance);
  }

  // ─── slicing ───────────────────────────────────────────────────────────────

  /**
   * Return a new {@link SparseArray} for the slice `[start, end)`.
   *
   * @example
   * ```ts
   * const arr = SparseArray.fromDense([1, 0, 0, 4, 0, 3], 0);
   * arr.slice(1, 5).toDense();  // [0, 0, 4, 0]
   * ```
   */
  slice(start: number, end: number = this._length): SparseArray {
    const s = Math.max(0, start < 0 ? this._length + start : start);
    const e = Math.min(this._length, end < 0 ? this._length + end : end);
    const newLen = Math.max(0, e - s);

    const newIndices: number[] = [];
    const newValues: number[] = [];
    for (let k = 0; k < this._indices.length; k++) {
      const idx = this._indices[k];
      const v = this._values[k];
      if (idx === undefined || v === undefined) {
        continue;
      }
      if (idx >= s && idx < e) {
        newIndices.push(idx - s);
        newValues.push(v);
      }
    }
    return new SparseArray(
      newLen,
      new Int32Array(newIndices),
      new Float64Array(newValues),
      this._fillValue,
      this._dtype.subtype,
    );
  }

  // ─── iteration ─────────────────────────────────────────────────────────────

  /**
   * Iterate over all values (including fill positions) in order.
   *
   * @example
   * ```ts
   * for (const v of SparseArray.fromDense([1, 0, 0, 4], 0)) {
   *   console.log(v);  // 1, 0, 0, 4
   * }
   * ```
   */
  [Symbol.iterator](): Iterator<number> {
    return this.toDense()[Symbol.iterator]();
  }

  // ─── display ───────────────────────────────────────────────────────────────

  /** @internal */
  toString(): string {
    const preview = this.toDense().slice(0, 6).join(", ");
    const ellipsis = this._length > 6 ? ", ..." : "";
    return `SparseArray([${preview}${ellipsis}], fill_value=${this._fillValue}, dtype=${this._dtype})`;
  }
}
