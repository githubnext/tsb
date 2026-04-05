/**
 * Period — represents a span of time with a fixed frequency.
 *
 * Mirrors `pandas.Period` and `pandas.PeriodIndex`: a Period is an interval
 * of time (e.g. a calendar month, fiscal quarter, or hour).  A PeriodIndex
 * is an ordered collection of Period values with uniform frequency.
 *
 * Supported frequencies:
 * - `"A"` / `"Y"` — annual (calendar year)
 * - `"Q"` — quarterly (Jan–Mar, Apr–Jun, Jul–Sep, Oct–Dec)
 * - `"M"` — monthly
 * - `"W"` — weekly (ISO week, Monday start)
 * - `"D"` — daily
 * - `"H"` — hourly
 * - `"T"` / `"min"` — minute
 * - `"S"` — secondly
 *
 * @example
 * ```ts
 * const p = Period.fromDate(new Date("2024-03-15"), "M");
 * p.toString();     // "2024-03"
 * p.ordinal;        // months since epoch
 * p.startDate;      // 2024-03-01T00:00:00.000Z
 * p.endDate;        // 2024-03-31T23:59:59.999Z
 * ```
 */

// ─── frequency ────────────────────────────────────────────────────────────────

/** Supported period frequencies. */
export type PeriodFreq = "A" | "Y" | "Q" | "M" | "W" | "D" | "H" | "T" | "min" | "S";

/** Canonical (alias-resolved) frequency — the form used internally. */
export type CanonFreq = "A" | "Q" | "M" | "W" | "D" | "H" | "T" | "S";

/** Normalise aliases to canonical form. */
function canonicalFreq(freq: PeriodFreq): CanonFreq {
  if (freq === "Y") {
    return "A";
  }
  if (freq === "min") {
    return "T";
  }
  return freq;
}

// ─── ordinal helpers ──────────────────────────────────────────────────────────

const MS_HOUR = 3_600_000;
const MS_DAY = 86_400_000;
const MS_WEEK = 7 * MS_DAY;

/** Milliseconds since UTC epoch for ordinal computation. */
function dateOrdinal(date: Date, freq: CanonFreq): number {
  const cf = canonicalFreq(freq);
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth(); // 0-based
  switch (cf) {
    case "A":
      return y;
    case "Q":
      return y * 4 + Math.floor(m / 3);
    case "M":
      return y * 12 + m;
    case "W":
      // ISO week ordinal: days since epoch divided by 7, week starting Mon
      return Math.floor(date.getTime() / MS_WEEK);
    case "D":
      return Math.floor(date.getTime() / MS_DAY);
    case "H":
      return Math.floor(date.getTime() / MS_HOUR);
    case "T":
      return Math.floor(date.getTime() / 60_000);
    case "S":
      return Math.floor(date.getTime() / 1_000);
    default: {
      const _x: never = cf;
      throw new Error(`Unknown frequency: ${_x}`);
    }
  }
}

/** Convert an ordinal back to the start-of-period UTC Date. */
function ordinalToStart(ordinal: number, freq: CanonFreq): Date {
  const cf = canonicalFreq(freq);
  switch (cf) {
    case "A":
      return new Date(Date.UTC(ordinal, 0, 1));
    case "Q": {
      const y = Math.floor(ordinal / 4);
      const q = ordinal - y * 4; // 0-3
      return new Date(Date.UTC(y, q * 3, 1));
    }
    case "M": {
      const y = Math.floor(ordinal / 12);
      const mo = ordinal - y * 12;
      return new Date(Date.UTC(y, mo, 1));
    }
    case "W":
      return new Date(ordinal * MS_WEEK);
    case "D":
      return new Date(ordinal * MS_DAY);
    case "H":
      return new Date(ordinal * MS_HOUR);
    case "T":
      return new Date(ordinal * 60_000);
    case "S":
      return new Date(ordinal * 1_000);
    default: {
      const _x: never = cf;
      throw new Error(`Unknown frequency: ${_x}`);
    }
  }
}

/** Duration of one period in ms (approximate for calendar periods). */
function periodDurationMs(ordinal: number, freq: CanonFreq): number {
  const cf = canonicalFreq(freq);
  const start = ordinalToStart(ordinal, cf);
  const next = ordinalToStart(ordinal + 1, cf);
  return next.getTime() - start.getTime();
}

// ─── Period ───────────────────────────────────────────────────────────────────

/**
 * An immutable time-period value with a fixed frequency.
 */
export class Period {
  /** Integer ordinal identifying this period within its frequency. */
  readonly ordinal: number;
  /** The period's frequency (always canonical: never "Y" or "min"). */
  readonly freq: CanonFreq;

  constructor(ordinal: number, freq: PeriodFreq) {
    this.ordinal = ordinal;
    this.freq = canonicalFreq(freq);
  }

  // ─── factory ────────────────────────────────────────────────────────────────

  /** Construct a Period from a `Date` and frequency. */
  static fromDate(date: Date, freq: PeriodFreq): Period {
    const cf = canonicalFreq(freq);
    return new Period(dateOrdinal(date, cf), cf);
  }

  /** Parse a string representation (e.g. `"2024-03"` for monthly). */
  static parse(s: string, freq: PeriodFreq): Period {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) {
      throw new TypeError(`Period.parse: cannot parse '${s}' as a date.`);
    }
    return Period.fromDate(d, freq);
  }

  // ─── boundaries ─────────────────────────────────────────────────────────────

  /** The first moment of this period (inclusive). */
  get startDate(): Date {
    return ordinalToStart(this.ordinal, this.freq);
  }

  /** The last moment of this period (inclusive, 1 ms before next period). */
  get endDate(): Date {
    const dur = periodDurationMs(this.ordinal, this.freq);
    return new Date(this.startDate.getTime() + dur - 1);
  }

  // ─── arithmetic ─────────────────────────────────────────────────────────────

  /** Return the period `n` steps forward (negative for backward). */
  shift(n: number): Period {
    return new Period(this.ordinal + n, this.freq);
  }

  // ─── comparison ─────────────────────────────────────────────────────────────

  /** True if both periods have the same freq and ordinal. */
  equals(other: Period): boolean {
    return this.freq === other.freq && this.ordinal === other.ordinal;
  }

  compareTo(other: Period): number {
    if (this.freq !== other.freq) {
      throw new Error(
        `Cannot compare periods with different frequencies: ${this.freq} vs ${other.freq}`,
      );
    }
    return this.ordinal - other.ordinal;
  }

  // ─── display ────────────────────────────────────────────────────────────────

  toString(): string {
    const d = this.startDate;
    const cf = canonicalFreq(this.freq);
    const y = d.getUTCFullYear();
    const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
    switch (cf) {
      case "A":
        return String(y);
      case "Q": {
        const q = Math.floor(d.getUTCMonth() / 3) + 1;
        return `${y}Q${q}`;
      }
      case "M":
        return `${y}-${mo}`;
      case "W": {
        const day = String(d.getUTCDate()).padStart(2, "0");
        return `${y}-${mo}-${day}/W`;
      }
      case "D": {
        const day = String(d.getUTCDate()).padStart(2, "0");
        return `${y}-${mo}-${day}`;
      }
      case "H": {
        const day = String(d.getUTCDate()).padStart(2, "0");
        const h = String(d.getUTCHours()).padStart(2, "0");
        return `${y}-${mo}-${day} ${h}:00`;
      }
      case "T": {
        const day = String(d.getUTCDate()).padStart(2, "0");
        const h = String(d.getUTCHours()).padStart(2, "0");
        const min = String(d.getUTCMinutes()).padStart(2, "0");
        return `${y}-${mo}-${day} ${h}:${min}`;
      }
      case "S": {
        const day = String(d.getUTCDate()).padStart(2, "0");
        const h = String(d.getUTCHours()).padStart(2, "0");
        const min = String(d.getUTCMinutes()).padStart(2, "0");
        const s = String(d.getUTCSeconds()).padStart(2, "0");
        return `${y}-${mo}-${day} ${h}:${min}:${s}`;
      }
      default: {
        const _x: never = cf;
        throw new Error(`Unknown frequency: ${_x}`);
      }
    }
  }
}

// ─── PeriodIndex ──────────────────────────────────────────────────────────────

/**
 * An immutable ordered sequence of `Period` values with a uniform frequency.
 *
 * Mirrors `pandas.PeriodIndex`.
 */
export class PeriodIndex {
  private readonly _periods: readonly Period[];
  /** The uniform frequency of all periods in this index (always canonical). */
  readonly freq: CanonFreq;

  private constructor(periods: readonly Period[], freq: PeriodFreq) {
    this._periods = periods;
    this.freq = canonicalFreq(freq);
  }

  // ─── factories ──────────────────────────────────────────────────────────────

  /**
   * Create a `PeriodIndex` from an array of `Period` objects.
   *
   * @throws If periods have mixed frequencies.
   */
  static fromPeriods(periods: readonly Period[]): PeriodIndex {
    if (periods.length === 0) {
      return new PeriodIndex([], "D");
    }
    const freq = periods[0]?.freq ?? "D";
    for (const p of periods) {
      if (canonicalFreq(p.freq) !== canonicalFreq(freq)) {
        throw new Error("PeriodIndex.fromPeriods: all periods must have the same frequency.");
      }
    }
    return new PeriodIndex([...periods], freq);
  }

  /**
   * Create a contiguous range of periods.
   *
   * @param start - The start date/time.
   * @param periods - Number of periods to generate.
   * @param freq - Period frequency.
   */
  static range(start: Date, periods: number, freq: PeriodFreq): PeriodIndex {
    const first = Period.fromDate(start, freq);
    const arr: Period[] = Array.from({ length: periods }, (_, i) => first.shift(i));
    return new PeriodIndex(arr, freq);
  }

  // ─── properties ─────────────────────────────────────────────────────────────

  get length(): number {
    return this._periods.length;
  }

  /** All periods as a readonly array. */
  get values(): readonly Period[] {
    return this._periods;
  }

  /** Period at integer position `i`. */
  iloc(i: number): Period {
    const p = this._periods[i];
    if (p === undefined) {
      throw new RangeError(
        `PeriodIndex: index ${i} out of bounds (length ${this._periods.length}).`,
      );
    }
    return p;
  }

  // ─── operations ─────────────────────────────────────────────────────────────

  /** Shift all periods by `n` steps. */
  shift(n: number): PeriodIndex {
    return new PeriodIndex(
      this._periods.map((p) => p.shift(n)),
      this.freq,
    );
  }

  /** Array of `startDate` for every period. */
  startTimes(): Date[] {
    return this._periods.map((p) => p.startDate);
  }

  /** Array of `endDate` for every period. */
  endTimes(): Date[] {
    return this._periods.map((p) => p.endDate);
  }

  toString(): string {
    const labels = this._periods.map((p) => p.toString());
    return `PeriodIndex([${labels.join(", ")}], dtype='period[${this.freq}]')`;
  }

  [Symbol.iterator](): Iterator<Period> {
    return this._periods[Symbol.iterator]();
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Generate a sequence of periods from `start` to `end` (inclusive).
 *
 * @param start - Start date.
 * @param end   - End date.
 * @param freq  - Period frequency.
 */
export function periodRange(start: Date, end: Date, freq: PeriodFreq): PeriodIndex {
  const cf = canonicalFreq(freq);
  const startOrd = dateOrdinal(start, cf);
  const endOrd = dateOrdinal(end, cf);
  const n = endOrd - startOrd + 1;
  if (n <= 0) {
    return PeriodIndex.fromPeriods([]);
  }
  return PeriodIndex.range(start, n, cf);
}
