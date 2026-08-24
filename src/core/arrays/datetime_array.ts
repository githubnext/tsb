/**
 * DatetimeArray — extension array of nullable {@link Timestamp} values.
 *
 * Mirrors `pandas.arrays.DatetimeArray`. Stores an array of Timestamps (with
 * optional timezone) with a separate boolean mask for missing (NA) values.
 *
 * @example
 * ```ts
 * import { arrays } from "tsb";
 * import { Timestamp } from "tsb";
 *
 * const a = arrays.DatetimeArray.from([
 *   new Timestamp("2024-01-01"),
 *   null,
 *   new Timestamp("2024-03-15"),
 * ]);
 * a.dtype;        // "datetime64[ns]"
 * a.at(1);        // null
 * a.year;         // [2024, null, 2024]
 * a.month;        // [1, null, 3]
 * ```
 *
 * @module
 */

import { Timestamp } from "../timestamp.ts";
import type { TimestampOptions } from "../timestamp.ts";

// ─── DatetimeArray ────────────────────────────────────────────────────────────

/**
 * A nullable array of {@link Timestamp} values.
 *
 * Use {@link DatetimeArray.from} to create instances.
 */
export class DatetimeArray {
  private readonly _data: Timestamp[];
  private readonly _mask: boolean[];
  private readonly _tz: string | null;

  /** @internal */
  constructor(data: Timestamp[], mask: boolean[], tz: string | null = null) {
    if (data.length !== mask.length) {
      throw new RangeError(
        `DatetimeArray: data length (${data.length}) !== mask length (${mask.length})`,
      );
    }
    this._data = data;
    this._mask = mask;
    this._tz = tz;
  }

  // ─── Factory ───────────────────────────────────────────────────────────────

  /**
   * Create a {@link DatetimeArray} from a sequence of Timestamps, strings, or numbers.
   *
   * @param values - Each element may be a {@link Timestamp}, an ISO string
   *   (e.g. `"2024-01-01"`), a millisecond-since-epoch number, a JS `Date`,
   *   `null`, or `undefined`.
   * @param options - Options forwarded to the {@link Timestamp} constructor for
   *   non-Timestamp inputs (e.g. `{ unit: "s", tz: "UTC" }`).
   *
   * @example
   * ```ts
   * DatetimeArray.from(["2024-01-01", null, "2024-03-15"]);
   * DatetimeArray.from([1704067200000, null], { unit: "ms" });
   * ```
   */
  static from(
    values: Iterable<Timestamp | string | number | Date | null | undefined>,
    options?: Readonly<TimestampOptions>,
  ): DatetimeArray {
    const data: Timestamp[] = [];
    const mask: boolean[] = [];
    for (const v of values) {
      if (v === null || v === undefined) {
        data.push(new Timestamp(0));
        mask.push(true);
      } else if (v instanceof Timestamp) {
        data.push(v);
        mask.push(false);
      } else {
        data.push(new Timestamp(v as string | number | Date, options));
        mask.push(false);
      }
    }
    const tz = options?.tz ?? null;
    return new DatetimeArray(data, mask, typeof tz === "string" ? tz : null);
  }

  /** @internal */
  static _fromRaw(data: Timestamp[], mask: boolean[], tz: string | null = null): DatetimeArray {
    return new DatetimeArray(data, mask, tz);
  }

  // ─── Core accessors ────────────────────────────────────────────────────────

  /** Number of elements (including NAs). */
  get size(): number {
    return this._data.length;
  }

  /** Dtype string — mirrors pandas `datetime64[ns]` or `datetime64[ns, tz]`. */
  get dtype(): string {
    return this._tz ? `datetime64[ns, ${this._tz}]` : "datetime64[ns]";
  }

  /** IANA timezone, or `null` for timezone-naive arrays. */
  get tz(): string | null {
    return this._tz;
  }

  /**
   * Return the element at index `i`, or `null` if masked.
   * Supports negative indexing.
   */
  at(i: number): Timestamp | null {
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

  /** Numeric year for each element (NA → null). */
  get year(): (number | null)[] {
    return this._extractComponent((ts) => ts.year);
  }

  /** Month (1–12) for each element (NA → null). */
  get month(): (number | null)[] {
    return this._extractComponent((ts) => ts.month);
  }

  /** Day (1–31) for each element (NA → null). */
  get day(): (number | null)[] {
    return this._extractComponent((ts) => ts.day);
  }

  /** Hour (0–23) for each element (NA → null). */
  get hour(): (number | null)[] {
    return this._extractComponent((ts) => ts.hour);
  }

  /** Minute (0–59) for each element (NA → null). */
  get minute(): (number | null)[] {
    return this._extractComponent((ts) => ts.minute);
  }

  /** Second (0–59) for each element (NA → null). */
  get second(): (number | null)[] {
    return this._extractComponent((ts) => ts.second);
  }

  /** Millisecond (0–999) for each element (NA → null). */
  get millisecond(): (number | null)[] {
    return this._extractComponent((ts) => ts.millisecond);
  }

  /** Day of week (0=Monday … 6=Sunday) for each element (NA → null). */
  get dayofweek(): (number | null)[] {
    return this._extractComponent((ts) => ts.dayofweek);
  }

  /** Day of year (1–366) for each element (NA → null). */
  get dayofyear(): (number | null)[] {
    return this._extractComponent((ts) => ts.dayofyear);
  }

  /** Quarter (1–4) for each element (NA → null). */
  get quarter(): (number | null)[] {
    return this._extractComponent((ts) => ts.quarter);
  }

  // ─── Conversion ────────────────────────────────────────────────────────────

  /** Return an array of {@link Timestamp} or `null` for NA positions. */
  toArray(): (Timestamp | null)[] {
    return this._data.map((v, i) => (this._mask[i] ? null : v));
  }

  /** Milliseconds since epoch for each element (NA → null). */
  asMs(): (number | null)[] {
    return this._data.map((v, i) => (this._mask[i] ? null : v._utcMs));
  }

  // ─── fillna ───────────────────────────────────────────────────────────────

  /** Return a new DatetimeArray with NAs replaced by `value`. */
  fillna(value: Timestamp): DatetimeArray {
    const data = this._data.map((v, i) => (this._mask[i] ? value : v));
    const mask = new Array<boolean>(data.length).fill(false);
    return DatetimeArray._fromRaw(data, mask, this._tz);
  }

  // ─── Min / Max ─────────────────────────────────────────────────────────────

  /** Earliest (minimum) non-NA Timestamp, or `null` if all are NA. */
  min(): Timestamp | null {
    let result: Timestamp | null = null;
    for (let i = 0; i < this._data.length; i++) {
      if (this._mask[i]) {
        continue;
      }
      const v = this._data[i] as Timestamp;
      if (result === null || v._utcMs < result._utcMs) {
        result = v;
      }
    }
    return result;
  }

  /** Latest (maximum) non-NA Timestamp, or `null` if all are NA. */
  max(): Timestamp | null {
    let result: Timestamp | null = null;
    for (let i = 0; i < this._data.length; i++) {
      if (this._mask[i]) {
        continue;
      }
      const v = this._data[i] as Timestamp;
      if (result === null || v._utcMs > result._utcMs) {
        result = v;
      }
    }
    return result;
  }

  // ─── Iteration ─────────────────────────────────────────────────────────────

  [Symbol.iterator](): Iterator<Timestamp | null> {
    let i = 0;
    const data = this._data;
    const mask = this._mask;
    return {
      next(): IteratorResult<Timestamp | null, null> {
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
    const items = this.toArray().map((v) => (v === null ? "<NA>" : v.isoformat()));
    return `DatetimeArray([${items.join(", ")}], dtype="${this.dtype}")`;
  }

  // ─── Private helper ────────────────────────────────────────────────────────

  private _extractComponent(fn: (ts: Timestamp) => number): (number | null)[] {
    return this._data.map((v, i) => (this._mask[i] ? null : fn(v)));
  }
}
