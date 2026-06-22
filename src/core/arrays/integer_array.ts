/**
 * IntegerArray — nullable integer extension array.
 *
 * Mirrors `pandas.arrays.IntegerArray`. Stores integer values with a separate
 * boolean mask to represent missing (NA) values.  Supports all integer dtypes
 * that pandas uses: `Int8`, `Int16`, `Int32`, `Int64`, `UInt8`, `UInt16`,
 * `UInt32`, `UInt64` (note capital letter — these are the *nullable* variants
 * distinct from NumPy `int8` etc.).
 *
 * @example
 * ```ts
 * import { arrays } from "tsb";
 *
 * const a = arrays.IntegerArray.from([1, null, 3, null, 5], "Int32");
 * a.dtype;              // "Int32"
 * a.size;               // 5
 * a.at(1);              // null
 * a.toArray();          // [1, null, 3, null, 5]
 * a.sum();              // 9
 * a.fillna(0).toArray(); // [1, 0, 3, 0, 5]
 * ```
 *
 * @module
 */

import { MaskedArray } from "./masked_array.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Nullable integer dtype names (capital letter prefix = nullable in pandas).
 */
export type IntegerDtypeName =
  | "Int8"
  | "Int16"
  | "Int32"
  | "Int64"
  | "UInt8"
  | "UInt16"
  | "UInt32"
  | "UInt64";

const INTEGER_DTYPES = new Set<IntegerDtypeName>([
  "Int8",
  "Int16",
  "Int32",
  "Int64",
  "UInt8",
  "UInt16",
  "UInt32",
  "UInt64",
]);

/** @internal */
function isIntegerDtypeName(s: string): s is IntegerDtypeName {
  return INTEGER_DTYPES.has(s as IntegerDtypeName);
}

// ─── Bounds checking ─────────────────────────────────────────────────────────

const BOUNDS: Record<IntegerDtypeName, readonly [number, number]> = {
  Int8: [-128, 127],
  Int16: [-32768, 32767],
  Int32: [-2147483648, 2147483647],
  Int64: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
  UInt8: [0, 255],
  UInt16: [0, 65535],
  UInt32: [0, 4294967295],
  UInt64: [0, Number.MAX_SAFE_INTEGER],
};

/** @internal */
function checkBounds(value: number, dtype: IntegerDtypeName): void {
  const [lo, hi] = BOUNDS[dtype];
  if (value < lo || value > hi) {
    throw new RangeError(
      `IntegerArray(${dtype}): value ${value} out of bounds [${lo}, ${hi}]`,
    );
  }
}

// ─── IntegerArray ─────────────────────────────────────────────────────────────

/**
 * A nullable integer array.
 *
 * Use {@link IntegerArray.from} to create instances.
 */
export class IntegerArray extends MaskedArray<number> {
  private readonly _dtype: IntegerDtypeName;

  /** @internal */
  constructor(data: number[], mask: boolean[], dtype: IntegerDtypeName) {
    super(data, mask);
    this._dtype = dtype;
  }

  // ─── Factory ───────────────────────────────────────────────────────────────

  /**
   * Create an {@link IntegerArray} from a sequence of values (or `null`/`undefined`
   * for missing values) and an optional dtype.
   *
   * @param values - Source values. `null` and `undefined` become NA.
   * @param dtype - Target dtype.  Defaults to `"Int64"`.
   *
   * @example
   * ```ts
   * IntegerArray.from([1, 2, null, 4]);          // Int64
   * IntegerArray.from([1, 2, null], "Int32");    // Int32
   * ```
   */
  static from(
    values: Iterable<number | null | undefined>,
    dtype: IntegerDtypeName = "Int64",
  ): IntegerArray {
    if (!isIntegerDtypeName(dtype)) {
      throw new TypeError(`IntegerArray: unknown dtype "${dtype}"`);
    }
    const data: number[] = [];
    const mask: boolean[] = [];
    for (const v of values) {
      if (v === null || v === undefined) {
        data.push(0);
        mask.push(true);
      } else {
        const int = Math.trunc(v);
        checkBounds(int, dtype);
        data.push(int);
        mask.push(false);
      }
    }
    return new IntegerArray(data, mask, dtype);
  }

  /**
   * Create an {@link IntegerArray} from a raw buffer (no copying, no validation).
   *
   * @internal
   */
  static _fromRaw(
    data: number[],
    mask: boolean[],
    dtype: IntegerDtypeName,
  ): IntegerArray {
    return new IntegerArray(data, mask, dtype);
  }

  // ─── Dtype ────────────────────────────────────────────────────────────────

  get dtype(): IntegerDtypeName {
    return this._dtype;
  }

  // ─── Operations ───────────────────────────────────────────────────────────

  /**
   * Sum of non-NA elements.  Returns `null` if all elements are NA and
   * `skipna` is `false`.
   */
  sum(skipna = true): number | null {
    let total = 0;
    let hasNonNa = false;
    for (let i = 0; i < this._data.length; i++) {
      if (this._mask[i]) {
        if (!skipna) {
          return null;
        }
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
        if (!skipna) {
          return null;
        }
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
        if (!skipna) {
          return null;
        }
        continue;
      }
      const v = this._data[i] as number;
      if (result === null || v < result) {
        result = v;
      }
    }
    return result;
  }

  /** Maximum non-NA element. */
  max(skipna = true): number | null {
    let result: number | null = null;
    for (let i = 0; i < this._data.length; i++) {
      if (this._mask[i]) {
        if (!skipna) {
          return null;
        }
        continue;
      }
      const v = this._data[i] as number;
      if (result === null || v > result) {
        result = v;
      }
    }
    return result;
  }

  /** Number of non-NA elements. */
  count(): number {
    return this._mask.filter((m) => !m).length;
  }

  // ─── Element-wise arithmetic ──────────────────────────────────────────────

  /** Element-wise addition.  NA propagates. */
  add(other: IntegerArray | number): IntegerArray {
    const [data, mask] = this._binop(other, (a, b) => a + b);
    return IntegerArray._fromRaw(data, mask, this._dtype);
  }

  /** Element-wise subtraction.  NA propagates. */
  sub(other: IntegerArray | number): IntegerArray {
    const [data, mask] = this._binop(other, (a, b) => a - b);
    return IntegerArray._fromRaw(data, mask, this._dtype);
  }

  /** Element-wise multiplication.  NA propagates. */
  mul(other: IntegerArray | number): IntegerArray {
    const [data, mask] = this._binop(other, (a, b) => a * b);
    return IntegerArray._fromRaw(data, mask, this._dtype);
  }

  /** Element-wise integer division.  NA propagates. */
  floordiv(other: IntegerArray | number): IntegerArray {
    const [data, mask] = this._binop(other, (a, b) => Math.trunc(a / b));
    return IntegerArray._fromRaw(data, mask, this._dtype);
  }

  /** Element-wise modulo.  NA propagates. */
  mod(other: IntegerArray | number): IntegerArray {
    const [data, mask] = this._binop(other, (a, b) => a % b);
    return IntegerArray._fromRaw(data, mask, this._dtype);
  }

  /** Element-wise exponentiation.  NA propagates. */
  pow(other: IntegerArray | number): IntegerArray {
    const [data, mask] = this._binop(other, (a, b) => Math.trunc(a ** b));
    return IntegerArray._fromRaw(data, mask, this._dtype);
  }

  /** @internal */
  private _binop(
    other: IntegerArray | number,
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
        `IntegerArray: operand size mismatch (${this.size} vs ${other.size})`,
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
   * Return a new {@link IntegerArray} with NAs replaced by `value`.
   */
  fillna(value: number): IntegerArray {
    const data = this._data.map((v, i) => (this._mask[i] ? value : v));
    const mask = new Array<boolean>(data.length).fill(false);
    return IntegerArray._fromRaw(data, mask, this._dtype);
  }

  // ─── Type conversion ──────────────────────────────────────────────────────

  /** Convert to another integer dtype. */
  astype(dtype: IntegerDtypeName): IntegerArray {
    if (!isIntegerDtypeName(dtype)) {
      throw new TypeError(`IntegerArray.astype: unknown dtype "${dtype}"`);
    }
    const data = this._data.map((v, i) => {
      if (this._mask[i]) {
        return 0;
      }
      checkBounds(v, dtype);
      return v;
    });
    return IntegerArray._fromRaw(data, this._mask.slice(), dtype);
  }
}
