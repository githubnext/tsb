/**
 * BooleanArray — nullable boolean extension array.
 *
 * Mirrors `pandas.arrays.BooleanArray`. Stores boolean values with a separate
 * mask for missing (NA) values, enabling three-valued logic (True / False / NA).
 *
 * @example
 * ```ts
 * import { arrays } from "tsb";
 *
 * const a = arrays.BooleanArray.from([true, null, false]);
 * a.dtype;                  // "boolean"
 * a.at(1);                  // null
 * a.any();                  // true
 * a.all();                  // false
 * a.fillna(false).toArray(); // [true, false, false]
 * ```
 *
 * @module
 */

import { MaskedArray } from "./masked_array.ts";

// ─── BooleanArray ─────────────────────────────────────────────────────────────

/**
 * A nullable boolean array.
 *
 * Use {@link BooleanArray.from} to create instances.
 */
export class BooleanArray extends MaskedArray<boolean> {
  /** @internal */
  constructor(data: boolean[], mask: boolean[]) {
    super(data, mask);
  }

  // ─── Factory ───────────────────────────────────────────────────────────────

  /**
   * Create a {@link BooleanArray} from a sequence of boolean (or null/undefined).
   *
   * @example
   * ```ts
   * BooleanArray.from([true, false, null, true]);
   * ```
   */
  static from(values: Iterable<boolean | null | undefined>): BooleanArray {
    const data: boolean[] = [];
    const mask: boolean[] = [];
    for (const v of values) {
      if (v === null || v === undefined) {
        data.push(false);
        mask.push(true);
      } else {
        data.push(Boolean(v));
        mask.push(false);
      }
    }
    return new BooleanArray(data, mask);
  }

  /** @internal */
  static _fromRaw(data: boolean[], mask: boolean[]): BooleanArray {
    return new BooleanArray(data, mask);
  }

  // ─── Dtype ────────────────────────────────────────────────────────────────

  get dtype(): "boolean" {
    return "boolean";
  }

  // ─── Reductions ───────────────────────────────────────────────────────────

  /**
   * Return `true` if any non-NA element is `true`.
   * Returns `null` if all elements are NA and `skipna` is `false`.
   */
  any(skipna = true): boolean | null {
    for (let i = 0; i < this._data.length; i++) {
      if (this._mask[i]) {
        if (!skipna) return null;
        continue;
      }
      if (this._data[i]) return true;
    }
    return false;
  }

  /**
   * Return `true` if all non-NA elements are `true`.
   * Returns `null` if all elements are NA and `skipna` is `false`.
   */
  all(skipna = true): boolean | null {
    for (let i = 0; i < this._data.length; i++) {
      if (this._mask[i]) {
        if (!skipna) return null;
        continue;
      }
      if (!this._data[i]) return false;
    }
    return true;
  }

  /** Count of `true` (non-NA) elements. */
  sum(skipna = true): number | null {
    let count = 0;
    for (let i = 0; i < this._data.length; i++) {
      if (this._mask[i]) {
        if (!skipna) return null;
        continue;
      }
      if (this._data[i]) count++;
    }
    return count;
  }

  // ─── Logical operations ───────────────────────────────────────────────────

  /**
   * Element-wise logical AND.
   *
   * Follows Kleene three-valued logic:
   * - `false AND NA` → `false`
   * - `true AND NA` → `NA`
   */
  and(other: BooleanArray): BooleanArray {
    if (other.size !== this.size) {
      throw new RangeError(
        `BooleanArray: operand size mismatch (${this.size} vs ${other.size})`,
      );
    }
    const data: boolean[] = [];
    const mask: boolean[] = [];
    for (let i = 0; i < this._data.length; i++) {
      const am = this._mask[i] === true;
      const bm = other._mask[i] === true;
      const av = this._data[i] === true;
      const bv = other._data[i] === true;
      if (!am && !bm) {
        // Both known
        data.push(av && bv);
        mask.push(false);
      } else if (!am && !av) {
        // a is false → false AND anything = false
        data.push(false);
        mask.push(false);
      } else if (!bm && !bv) {
        // b is false → anything AND false = false
        data.push(false);
        mask.push(false);
      } else {
        // Result is NA
        data.push(false);
        mask.push(true);
      }
    }
    return BooleanArray._fromRaw(data, mask);
  }

  /**
   * Element-wise logical OR.
   *
   * Follows Kleene three-valued logic:
   * - `true OR NA` → `true`
   * - `false OR NA` → `NA`
   */
  or(other: BooleanArray): BooleanArray {
    if (other.size !== this.size) {
      throw new RangeError(
        `BooleanArray: operand size mismatch (${this.size} vs ${other.size})`,
      );
    }
    const data: boolean[] = [];
    const mask: boolean[] = [];
    for (let i = 0; i < this._data.length; i++) {
      const am = this._mask[i] === true;
      const bm = other._mask[i] === true;
      const av = this._data[i] === true;
      const bv = other._data[i] === true;
      if (!am && !bm) {
        // Both known
        data.push(av || bv);
        mask.push(false);
      } else if (!am && av) {
        // a is true → true OR anything = true
        data.push(true);
        mask.push(false);
      } else if (!bm && bv) {
        // b is true → anything OR true = true
        data.push(true);
        mask.push(false);
      } else {
        // Result is NA
        data.push(false);
        mask.push(true);
      }
    }
    return BooleanArray._fromRaw(data, mask);
  }

  /**
   * Element-wise logical NOT.
   * `NOT NA` → `NA`; `NOT true` → `false`; `NOT false` → `true`.
   */
  not(): BooleanArray {
    const data = this._data.map((v, i) => (this._mask[i] ? false : !v));
    return BooleanArray._fromRaw(data, this._mask.slice());
  }

  // ─── fillna ───────────────────────────────────────────────────────────────

  /**
   * Return a new {@link BooleanArray} with NAs replaced by `value`.
   */
  fillna(value: boolean): BooleanArray {
    const data = this._data.map((v, i) => (this._mask[i] ? value : v));
    const mask = new Array<boolean>(data.length).fill(false);
    return BooleanArray._fromRaw(data, mask);
  }
}
