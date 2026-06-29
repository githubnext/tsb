/**
 * TimedeltaArray — extension array of nullable {@link Timedelta} values.
 *
 * Mirrors `pandas.arrays.TimedeltaArray`. Stores an array of Timedelta values
 * with a separate boolean mask for missing (NA) values.
 *
 * @example
 * ```ts
 * import { arrays } from "tsb";
 * import { Timedelta } from "tsb";
 *
 * const a = arrays.TimedeltaArray.from([
 *   Timedelta.fromComponents({ days: 1 }),
 *   null,
 *   Timedelta.fromComponents({ hours: 6 }),
 * ]);
 * a.dtype;        // "timedelta64[ns]"
 * a.at(1);        // null
 * a.days;         // [1, null, 0]
 * a.totalSeconds; // [86400, null, 21600]
 * ```
 *
 * @module
 */

import { Timedelta } from "../timedelta.ts";

// ─── TimedeltaArray ───────────────────────────────────────────────────────────

/**
 * A nullable array of {@link Timedelta} values.
 *
 * Use {@link TimedeltaArray.from} to create instances.
 */
export class TimedeltaArray {
  private readonly _data: Timedelta[];
  private readonly _mask: boolean[];

  /** @internal */
  constructor(data: Timedelta[], mask: boolean[]) {
    if (data.length !== mask.length) {
      throw new RangeError(
        `TimedeltaArray: data length (${data.length}) !== mask length (${mask.length})`,
      );
    }
    this._data = data;
    this._mask = mask;
  }

  // ─── Factory ───────────────────────────────────────────────────────────────

  /**
   * Create a {@link TimedeltaArray} from a sequence of Timedelta values,
   * numbers (milliseconds), ISO strings, or null/undefined.
   *
   * @param values - Source values.  Numbers are interpreted as milliseconds.
   *   ISO duration strings like `"1 days 02:00:00"` or `"P1DT2H"` are parsed.
   *
   * @example
   * ```ts
   * TimedeltaArray.from([
   *   Timedelta.fromComponents({ days: 1 }),
   *   null,
   *   86400000, // 1 day in ms
   *   "1 days 00:00:00",
   * ]);
   * ```
   */
  static from(values: Iterable<Timedelta | number | string | null | undefined>): TimedeltaArray {
    const data: Timedelta[] = [];
    const mask: boolean[] = [];
    for (const v of values) {
      if (v === null || v === undefined) {
        data.push(Timedelta.fromMilliseconds(0));
        mask.push(true);
      } else if (v instanceof Timedelta) {
        data.push(v);
        mask.push(false);
      } else if (typeof v === "number") {
        data.push(Timedelta.fromMilliseconds(v));
        mask.push(false);
      } else {
        data.push(Timedelta.parse(v));
        mask.push(false);
      }
    }
    return new TimedeltaArray(data, mask);
  }

  /** @internal */
  static _fromRaw(data: Timedelta[], mask: boolean[]): TimedeltaArray {
    return new TimedeltaArray(data, mask);
  }

  // ─── Core accessors ────────────────────────────────────────────────────────

  /** Number of elements (including NAs). */
  get size(): number {
    return this._data.length;
  }

  /** Dtype string — `"timedelta64[ns]"`. */
  get dtype(): "timedelta64[ns]" {
    return "timedelta64[ns]";
  }

  /**
   * Return the element at index `i`, or `null` if masked.
   * Supports negative indexing.
   */
  at(i: number): Timedelta | null {
    const idx = i < 0 ? this._data.length + i : i;
    if (idx < 0 || idx >= this._data.length) {
      return null;
    }
    if (this._mask[idx]) {
      return null;
    }
    return this._data[idx] ?? null;
  }

  // ─── NA ────────────────────────────────────────────────────────────────────

  /** Boolean array where `true` = NA. */
  isna(): boolean[] {
    return this._mask.slice();
  }

  /** Boolean array where `true` = not NA. */
  notna(): boolean[] {
    return this._mask.map((m) => !m);
  }

  // ─── Component accessors ──────────────────────────────────────────────────

  /** Integer days component for each element (NA → null). */
  get days(): (number | null)[] {
    return this._extractComponent((td) => td.days);
  }

  /** Integer hours component for each element (NA → null). */
  get hours(): (number | null)[] {
    return this._extractComponent((td) => td.hours);
  }

  /** Integer minutes component for each element (NA → null). */
  get minutes(): (number | null)[] {
    return this._extractComponent((td) => td.minutes);
  }

  /** Integer seconds component for each element (NA → null). */
  get seconds(): (number | null)[] {
    return this._extractComponent((td) => td.seconds);
  }

  /** Integer milliseconds component for each element (NA → null). */
  get milliseconds(): (number | null)[] {
    return this._extractComponent((td) => td.milliseconds);
  }

  /** Total number of milliseconds for each element (NA → null). */
  get totalMilliseconds(): (number | null)[] {
    return this._extractComponent((td) => td.totalMilliseconds);
  }

  /** Total number of seconds (float) for each element (NA → null). */
  get totalSeconds(): (number | null)[] {
    return this._extractComponent((td) => td.totalSeconds);
  }

  /** Total number of hours (float) for each element (NA → null). */
  get totalHours(): (number | null)[] {
    return this._extractComponent((td) => td.totalHours);
  }

  /** Total number of days (float) for each element (NA → null). */
  get totalDays(): (number | null)[] {
    return this._extractComponent((td) => td.totalDays);
  }

  // ─── Arithmetic ───────────────────────────────────────────────────────────

  /**
   * Add a scalar {@link Timedelta} to every element.  NA propagates.
   */
  add(other: TimedeltaArray | Timedelta): TimedeltaArray {
    if (other instanceof Timedelta) {
      const data = this._data.map((v, i) => (this._mask[i] ? v : v.add(other)));
      return TimedeltaArray._fromRaw(data, this._mask.slice());
    }
    if (other.size !== this.size) {
      throw new RangeError(`TimedeltaArray: operand size mismatch (${this.size} vs ${other.size})`);
    }
    const data: Timedelta[] = [];
    const mask: boolean[] = [];
    for (let i = 0; i < this._data.length; i++) {
      if (this._mask[i] || other._mask[i]) {
        data.push(Timedelta.fromMilliseconds(0));
        mask.push(true);
      } else {
        data.push((this._data[i] as Timedelta).add(other._data[i] as Timedelta));
        mask.push(false);
      }
    }
    return TimedeltaArray._fromRaw(data, mask);
  }

  /**
   * Subtract a scalar {@link Timedelta} from every element.  NA propagates.
   */
  sub(other: TimedeltaArray | Timedelta): TimedeltaArray {
    if (other instanceof Timedelta) {
      const data = this._data.map((v, i) => (this._mask[i] ? v : v.sub(other)));
      return TimedeltaArray._fromRaw(data, this._mask.slice());
    }
    if (other.size !== this.size) {
      throw new RangeError(`TimedeltaArray: operand size mismatch (${this.size} vs ${other.size})`);
    }
    const data: Timedelta[] = [];
    const mask: boolean[] = [];
    for (let i = 0; i < this._data.length; i++) {
      if (this._mask[i] || other._mask[i]) {
        data.push(Timedelta.fromMilliseconds(0));
        mask.push(true);
      } else {
        data.push((this._data[i] as Timedelta).sub(other._data[i] as Timedelta));
        mask.push(false);
      }
    }
    return TimedeltaArray._fromRaw(data, mask);
  }

  /** Multiply every element by a scalar.  NA propagates. */
  mul(factor: number): TimedeltaArray {
    const data = this._data.map((v, i) => (this._mask[i] ? v : v.mul(factor)));
    return TimedeltaArray._fromRaw(data, this._mask.slice());
  }

  // ─── Conversion ────────────────────────────────────────────────────────────

  /** Return an array of {@link Timedelta} or `null` for NA positions. */
  toArray(): (Timedelta | null)[] {
    return this._data.map((v, i) => (this._mask[i] ? null : v));
  }

  // ─── Reductions ───────────────────────────────────────────────────────────

  /** Sum of non-NA elements (millisecond precision). */
  sum(skipna = true): Timedelta | null {
    let total = 0;
    let hasNonNa = false;
    for (let i = 0; i < this._data.length; i++) {
      if (this._mask[i]) {
        if (!skipna) {
          return null;
        }
        continue;
      }
      total += (this._data[i] as Timedelta).totalMilliseconds;
      hasNonNa = true;
    }
    return hasNonNa || skipna ? Timedelta.fromMilliseconds(total) : null;
  }

  /** Minimum non-NA element. */
  min(): Timedelta | null {
    let result: Timedelta | null = null;
    for (let i = 0; i < this._data.length; i++) {
      if (this._mask[i]) {
        continue;
      }
      const v = this._data[i] as Timedelta;
      if (result === null || v.totalMilliseconds < result.totalMilliseconds) {
        result = v;
      }
    }
    return result;
  }

  /** Maximum non-NA element. */
  max(): Timedelta | null {
    let result: Timedelta | null = null;
    for (let i = 0; i < this._data.length; i++) {
      if (this._mask[i]) {
        continue;
      }
      const v = this._data[i] as Timedelta;
      if (result === null || v.totalMilliseconds > result.totalMilliseconds) {
        result = v;
      }
    }
    return result;
  }

  // ─── fillna ───────────────────────────────────────────────────────────────

  /** Return a new TimedeltaArray with NAs replaced by `value`. */
  fillna(value: Timedelta): TimedeltaArray {
    const data = this._data.map((v, i) => (this._mask[i] ? value : v));
    const mask = new Array<boolean>(data.length).fill(false);
    return TimedeltaArray._fromRaw(data, mask);
  }

  // ─── Iteration ─────────────────────────────────────────────────────────────

  [Symbol.iterator](): Iterator<Timedelta | null> {
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
    const items = this.toArray().map((v) => (v === null ? "<NA>" : v.toString()));
    return `TimedeltaArray([${items.join(", ")}], dtype="${this.dtype}")`;
  }

  // ─── Private helper ────────────────────────────────────────────────────────

  private _extractComponent(fn: (td: Timedelta) => number): (number | null)[] {
    return this._data.map((v, i) => (this._mask[i] ? null : fn(v)));
  }
}
