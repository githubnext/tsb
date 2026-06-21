/**
 * FloatingArray — nullable floating-point extension array.
 *
 * Mirrors `pandas.arrays.FloatingArray`. Stores float values with a separate
 * boolean mask for missing (NA) values.  Supports `Float32` and `Float64`
 * (capital-F nullable variants).
 *
 * @example
 * ```ts
 * import { arrays } from "tsb";
 *
 * const a = arrays.FloatingArray.from([1.5, null, 3.14], "Float64");
 * a.dtype;              // "Float64"
 * a.size;               // 3
 * a.at(1);              // null
 * a.sum();              // 4.64
 * a.fillna(0).toArray(); // [1.5, 0, 3.14]
 * ```
 *
 * @module
 */

import { MaskedArray } from "./masked_array.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Nullable float dtype names.
 */
export type FloatingDtypeName = "Float32" | "Float64";

// ─── FloatingArray ────────────────────────────────────────────────────────────

/**
 * A nullable floating-point array.
 *
 * Use {@link FloatingArray.from} to create instances.
 */
export class FloatingArray extends MaskedArray<number> {
  private readonly _dtype: FloatingDtypeName;

  /** @internal */
  constructor(data: number[], mask: boolean[], dtype: FloatingDtypeName) {
    super(data, mask);
    this._dtype = dtype;
  }

  // ─── Factory ───────────────────────────────────────────────────────────────

  /**
   * Create a {@link FloatingArray} from a sequence of values.
   *
   * @param values - Source values. `null`, `undefined`, and `NaN` become NA.
   * @param dtype - Target dtype.  Defaults to `"Float64"`.
   *
   * @example
   * ```ts
   * FloatingArray.from([1.1, 2.2, null, 4.4]);         // Float64
   * FloatingArray.from([1.1, NaN, 3.3], "Float32");    // Float32
   * ```
   */
  static from(
    values: Iterable<number | null | undefined>,
    dtype: FloatingDtypeName = "Float64",
  ): FloatingArray {
    if (dtype !== "Float32" && dtype !== "Float64") {
      throw new TypeError(`FloatingArray: unknown dtype "${dtype}"`);
    }
    const data: number[] = [];
    const mask: boolean[] = [];
    for (const v of values) {
      if (v === null || v === undefined || (typeof v === "number" && isNaN(v))) {
        data.push(0);
        mask.push(true);
      } else {
        data.push(dtype === "Float32" ? Math.fround(v) : v);
        mask.push(false);
      }
    }
    return new FloatingArray(data, mask, dtype);
  }

  /** @internal */
  static _fromRaw(
    data: number[],
    mask: boolean[],
    dtype: FloatingDtypeName,
  ): FloatingArray {
    return new FloatingArray(data, mask, dtype);
  }

  // ─── Dtype ────────────────────────────────────────────────────────────────

  get dtype(): FloatingDtypeName {
    return this._dtype;
  }

  // ─── Operations ───────────────────────────────────────────────────────────

  /** Sum of non-NA elements. */
  sum(skipna = true): number | null {
    let total = 0;
    let hasNonNa = false;
    for (let i = 0; i < this._data.length; i++) {
      if (this._mask[i]) {
        if (!skipna) return null;
        continue;
      }
      total += this._data[i] as number;
      hasNonNa = true;
    }
    return hasNonNa || skipna ? total : null;
  }

  /** Mean of non-NA elements. */
  mean(skipna = true): number | null {
    let total = 0;
    let count = 0;
    for (let i = 0; i < this._data.length; i++) {
      if (this._mask[i]) {
        if (!skipna) return null;
        continue;
      }
      total += this._data[i] as number;
      count++;
    }
    return count > 0 ? total / count : null;
  }

  /** Minimum non-NA element. */
  min(skipna = true): number | null {
    let result: number | null = null;
    for (let i = 0; i < this._data.length; i++) {
      if (this._mask[i]) {
        if (!skipna) return null;
        continue;
      }
      const v = this._data[i] as number;
      if (result === null || v < result) result = v;
    }
    return result;
  }

  /** Maximum non-NA element. */
  max(skipna = true): number | null {
    let result: number | null = null;
    for (let i = 0; i < this._data.length; i++) {
      if (this._mask[i]) {
        if (!skipna) return null;
        continue;
      }
      const v = this._data[i] as number;
      if (result === null || v > result) result = v;
    }
    return result;
  }

  /** Number of non-NA elements. */
  count(): number {
    return this._mask.filter((m) => !m).length;
  }

  /** Standard deviation of non-NA elements (sample, ddof=1). */
  std(skipna = true, ddof = 1): number | null {
    const m = this.mean(skipna);
    if (m === null) return null;
    let sumSq = 0;
    let count = 0;
    for (let i = 0; i < this._data.length; i++) {
      if (this._mask[i]) continue;
      const d = (this._data[i] as number) - m;
      sumSq += d * d;
      count++;
    }
    return count > ddof ? Math.sqrt(sumSq / (count - ddof)) : null;
  }

  // ─── Element-wise arithmetic ──────────────────────────────────────────────

  /** Element-wise addition.  NA propagates. */
  add(other: FloatingArray | number): FloatingArray {
    const [data, mask] = this._binop(other, (a, b) => a + b);
    return FloatingArray._fromRaw(data, mask, this._dtype);
  }

  /** Element-wise subtraction.  NA propagates. */
  sub(other: FloatingArray | number): FloatingArray {
    const [data, mask] = this._binop(other, (a, b) => a - b);
    return FloatingArray._fromRaw(data, mask, this._dtype);
  }

  /** Element-wise multiplication.  NA propagates. */
  mul(other: FloatingArray | number): FloatingArray {
    const [data, mask] = this._binop(other, (a, b) => a * b);
    return FloatingArray._fromRaw(data, mask, this._dtype);
  }

  /** Element-wise division.  NA propagates. Division by zero → ±Infinity (masked). */
  truediv(other: FloatingArray | number): FloatingArray {
    const [data, mask] = this._binop(other, (a, b) => a / b);
    return FloatingArray._fromRaw(data, mask, this._dtype);
  }

  /** Element-wise exponentiation.  NA propagates. */
  pow(other: FloatingArray | number): FloatingArray {
    const [data, mask] = this._binop(other, (a, b) => a ** b);
    return FloatingArray._fromRaw(data, mask, this._dtype);
  }

  /** @internal */
  private _binop(
    other: FloatingArray | number,
    fn: (a: number, b: number) => number,
  ): [number[], boolean[]] {
    if (typeof other === "number") {
      const data: number[] = [];
      const mask: boolean[] = [];
      for (let i = 0; i < this._data.length; i++) {
        if (this._mask[i]) {
          data.push(0);
          mask.push(true);
        } else {
          data.push(fn(this._data[i] as number, other));
          mask.push(false);
        }
      }
      return [data, mask];
    }
    if (other.size !== this.size) {
      throw new RangeError(
        `FloatingArray: operand size mismatch (${this.size} vs ${other.size})`,
      );
    }
    const data: number[] = [];
    const mask: boolean[] = [];
    for (let i = 0; i < this._data.length; i++) {
      if (this._mask[i] || other._mask[i]) {
        data.push(0);
        mask.push(true);
      } else {
        data.push(fn(this._data[i] as number, other._data[i] as number));
        mask.push(false);
      }
    }
    return [data, mask];
  }

  // ─── fillna ───────────────────────────────────────────────────────────────

  /**
   * Return a new {@link FloatingArray} with NAs replaced by `value`.
   */
  fillna(value: number): FloatingArray {
    const data = this._data.map((v, i) => (this._mask[i] ? value : v));
    const mask = new Array<boolean>(data.length).fill(false);
    return FloatingArray._fromRaw(data, mask, this._dtype);
  }

  // ─── Type conversion ──────────────────────────────────────────────────────

  /** Convert to another floating dtype. */
  astype(dtype: FloatingDtypeName): FloatingArray {
    if (dtype !== "Float32" && dtype !== "Float64") {
      throw new TypeError(`FloatingArray.astype: unknown dtype "${dtype}"`);
    }
    const data = this._data.map((v, i) => {
      if (this._mask[i]) return 0;
      return dtype === "Float32" ? Math.fround(v) : v;
    });
    return FloatingArray._fromRaw(data, this._mask.slice(), dtype);
  }
}
