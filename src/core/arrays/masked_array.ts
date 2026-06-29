/**
 * MaskedArray — base class for nullable extension arrays.
 *
 * Mirrors `pandas.core.arrays.masked.BaseMaskedArray`. Stores values and a
 * separate boolean mask where `true` means the element is NA (missing).
 *
 * All concrete nullable array types ({@link IntegerArray}, {@link FloatingArray},
 * {@link BooleanArray}) extend this class.
 *
 * @module
 */

import type { Scalar } from "../../types.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Values accepted as fill value for {@link MaskedArray.fillna}.
 */
export type FillValue<T> = T | null | undefined;

// ─── MaskedArray ─────────────────────────────────────────────────────────────

/**
 * Abstract base class for masked (nullable) arrays.
 *
 * @typeParam T - The underlying element type (number, boolean, string, etc.)
 *
 * @example
 * ```ts
 * // Constructed via subclasses, e.g. IntegerArray.from([1, null, 3])
 * ```
 */
export abstract class MaskedArray<T extends Scalar> {
  /**
   * Stored element values.  When `_mask[i]` is `true` this value is
   * undefined/unused, but we always maintain the same length for both arrays.
   */
  protected readonly _data: T[];
  /**
   * Boolean mask where `true` indicates a missing value (NA).
   */
  protected readonly _mask: boolean[];

  /** @internal */
  constructor(data: T[], mask: boolean[]) {
    if (data.length !== mask.length) {
      throw new RangeError(
        `MaskedArray: data length (${data.length}) !== mask length (${mask.length})`,
      );
    }
    this._data = data;
    this._mask = mask;
  }

  // ─── Core accessors ────────────────────────────────────────────────────────

  /** Number of elements (including NAs). */
  get size(): number {
    return this._data.length;
  }

  /** The dtype name for this array (defined by subclasses). */
  abstract get dtype(): string;

  /**
   * Return the element at index `i`, or `null` if it is masked.
   * Supports negative indexing.
   */
  at(i: number): T | null {
    const idx = i < 0 ? this._data.length + i : i;
    if (idx < 0 || idx >= this._data.length) {
      return null;
    }
    if (this._mask[idx]) {
      return null;
    }
    return this._data[idx] ?? null;
  }

  // ─── NA / notna ────────────────────────────────────────────────────────────

  /**
   * Return a boolean array where `true` indicates a missing element.
   *
   * @example
   * ```ts
   * IntegerArray.from([1, null, 3]).isna(); // [false, true, false]
   * ```
   */
  isna(): boolean[] {
    return this._mask.slice();
  }

  /**
   * Return a boolean array where `true` indicates a non-missing element.
   *
   * @example
   * ```ts
   * IntegerArray.from([1, null, 3]).notna(); // [true, false, true]
   * ```
   */
  notna(): boolean[] {
    return this._mask.map((m) => !m);
  }

  /** `true` if any element is NA. */
  hasNa(): boolean {
    return this._mask.some(Boolean);
  }

  // ─── Conversion ────────────────────────────────────────────────────────────

  /**
   * Return a plain JS array where masked elements are represented as `null`.
   *
   * @example
   * ```ts
   * IntegerArray.from([1, null, 3]).toArray(); // [1, null, 3]
   * ```
   */
  toArray(): (T | null)[] {
    return this._data.map((v, i) => (this._mask[i] ? null : v));
  }

  /**
   * Return a plain JS array, replacing each NA with `naValue`.
   *
   * @example
   * ```ts
   * IntegerArray.from([1, null, 3]).toArray(0); // [1, 0, 3]
   * ```
   */
  toArrayFilled(naValue: T): T[] {
    return this._data.map((v, i) => (this._mask[i] ? naValue : v));
  }

  // ─── fillna ────────────────────────────────────────────────────────────────

  /**
   * Return a new array with NAs replaced by `value`.
   *
   * @example
   * ```ts
   * IntegerArray.from([1, null, 3]).fillna(0).toArray(); // [1, 0, 3]
   * ```
   */
  abstract fillna(value: T): MaskedArray<T>;

  // ─── dropna ────────────────────────────────────────────────────────────────

  /**
   * Return the non-NA values as a plain JS array.
   *
   * @example
   * ```ts
   * IntegerArray.from([1, null, 3]).dropna(); // [1, 3]
   * ```
   */
  dropna(): T[] {
    const out: T[] = [];
    for (let i = 0; i < this._data.length; i++) {
      if (!this._mask[i]) {
        out.push(this._data[i] as T);
      }
    }
    return out;
  }

  // ─── Iteration ─────────────────────────────────────────────────────────────

  [Symbol.iterator](): Iterator<T | null> {
    let i = 0;
    const data = this._data;
    const mask = this._mask;
    return {
      next() {
        if (i >= data.length) {
          return { value: null, done: true };
        }
        const value = mask[i] ? null : (data[i] ?? null);
        i++;
        return { value, done: false };
      },
    };
  }

  // ─── String representation ─────────────────────────────────────────────────

  toString(): string {
    const items = this.toArray().map((v) => (v === null ? "<NA>" : String(v)));
    return `${this.dtype}([${items.join(", ")}])`;
  }
}
