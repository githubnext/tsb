/**
 * at_time / between_time — select rows of a datetime-indexed Series or
 * DataFrame that fall at (or between) particular times of day.
 *
 * Mirrors `pandas.Series.at_time` / `pandas.Series.between_time` and their
 * `DataFrame` equivalents.
 *
 * Both functions require the index to consist entirely of `Date` labels
 * (a "DatetimeIndex"); calling them on a non-datetime index throws, matching
 * pandas' `TypeError: Index must be DatetimeIndex`.
 *
 * - {@link atTimeSeries}      — filter a Series to rows at a specific time of day
 * - {@link atTimeDataFrame}   — filter a DataFrame's rows to a specific time of day
 * - {@link betweenTimeSeries}    — filter a Series to rows within a time-of-day window
 * - {@link betweenTimeDataFrame} — filter a DataFrame's rows within a time-of-day window
 *
 * @example
 * ```ts
 * import { Series, atTimeSeries, betweenTimeSeries } from "tsb";
 *
 * const idx = [
 *   new Date("2024-01-01T00:00:00Z"),
 *   new Date("2024-01-01T06:00:00Z"),
 *   new Date("2024-01-01T12:00:00Z"),
 * ];
 * const s = new Series({ data: [1, 2, 3], index: idx });
 * atTimeSeries(s, "06:00").values; // [2]
 * betweenTimeSeries(s, "00:00", "06:00").values; // [1, 2]
 * ```
 *
 * @module
 */

import { DataFrame, Index, Series } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/**
 * Which end(s) of the `between_time` window are inclusive.
 * Mirrors pandas' `inclusive` parameter.
 */
export type BetweenTimeInclusive = "both" | "left" | "right" | "neither";

// ─── internal helpers ─────────────────────────────────────────────────────────

/** Parsed time-of-day, expressed as milliseconds since local midnight. */
interface TimeOfDay {
  readonly ms: number;
}

const TIME_OF_DAY_RE = /^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?$/;

/** Parse a `"HH:MM"`, `"HH:MM:SS"`, or `"HH:MM:SS.ffffff"` time string. */
function parseTimeOfDay(time: string): TimeOfDay {
  const match = TIME_OF_DAY_RE.exec(time.trim());
  if (!match) {
    throw new Error(`Cannot parse time string "${time}"`);
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = match[3] !== undefined ? Number(match[3]) : 0;
  const fraction = match[4] !== undefined ? Number(`0.${match[4]}`) : 0;
  if (hours > 23 || minutes > 59 || seconds > 59) {
    throw new Error(`Cannot parse time string "${time}"`);
  }
  const ms = ((hours * 60 + minutes) * 60 + seconds) * 1000 + fraction * 1000;
  return { ms };
}

/** Milliseconds since local midnight for a `Date`. */
function timeOfDayMs(d: Date): number {
  return ((d.getHours() * 60 + d.getMinutes()) * 60 + d.getSeconds()) * 1000 + d.getMilliseconds();
}

/** Assert that every label in `idx` is a `Date`, throwing pandas' error text otherwise. */
function assertDatetimeIndex(idx: Index<Label>): void {
  for (let i = 0; i < idx.size; i++) {
    if (!(idx.at(i) instanceof Date)) {
      throw new TypeError("Index must be DatetimeIndex");
    }
  }
}

/** Positions in `idx` whose time-of-day exactly matches `time`. */
function atTimePositions(idx: Index<Label>, time: string): number[] {
  assertDatetimeIndex(idx);
  const target = parseTimeOfDay(time).ms;
  const positions: number[] = [];
  for (let i = 0; i < idx.size; i++) {
    const d = idx.at(i) as Date;
    if (timeOfDayMs(d) === target) {
      positions.push(i);
    }
  }
  return positions;
}

/**
 * Positions in `idx` whose time-of-day falls within `[start, end]`, handling
 * the "wraparound" case (e.g. `18:00` to `03:00`) exactly as pandas does.
 */
function betweenTimePositions(
  idx: Index<Label>,
  startTime: string,
  endTime: string,
  inclusive: BetweenTimeInclusive,
): number[] {
  assertDatetimeIndex(idx);
  const start = parseTimeOfDay(startTime).ms;
  const end = parseTimeOfDay(endTime).ms;
  const includeLeft = inclusive === "both" || inclusive === "left";
  const includeRight = inclusive === "both" || inclusive === "right";

  const inRange = (ms: number): boolean => {
    const atStart = includeLeft ? ms >= start : ms > start;
    const atEnd = includeRight ? ms <= end : ms < end;
    if (start <= end) {
      return atStart && atEnd;
    }
    // Wraparound window (e.g. 18:00 -> 03:00): matches [start, midnight] U [midnight, end].
    return atStart || atEnd;
  };

  const positions: number[] = [];
  for (let i = 0; i < idx.size; i++) {
    const d = idx.at(i) as Date;
    if (inRange(timeOfDayMs(d))) {
      positions.push(i);
    }
  }
  return positions;
}

// ─── atTimeSeries ──────────────────────────────────────────────────────────────

/**
 * Select rows of `s` whose index label falls exactly at `time` of day.
 *
 * Mirrors `pandas.Series.at_time(time)`.
 *
 * @param s    - Source Series; its index must consist entirely of `Date` labels.
 * @param time - Time of day, e.g. `"06:00"`, `"18:30:15"`.
 * @throws {TypeError} If `s.index` is not a DatetimeIndex.
 *
 * @example
 * ```ts
 * import { Series, atTimeSeries } from "tsb";
 *
 * const idx = [new Date("2024-01-01T06:00:00Z"), new Date("2024-01-01T12:00:00Z")];
 * const s = new Series({ data: [1, 2], index: idx });
 * atTimeSeries(s, "06:00").values; // [1]
 * ```
 */
export function atTimeSeries<T extends Scalar>(s: Series<T>, time: string): Series<T> {
  const positions = atTimePositions(s.index, time);
  const data = positions.map((i) => s.values[i] as T);
  const labels = positions.map((i) => s.index.at(i));
  return new Series<T>({ data, index: new Index<Label>(labels), dtype: s.dtype, name: s.name });
}

/**
 * Select rows of `df` whose row-index label falls exactly at `time` of day.
 *
 * Mirrors `pandas.DataFrame.at_time(time)`.
 *
 * @param df   - Source DataFrame; its index must consist entirely of `Date` labels.
 * @param time - Time of day, e.g. `"06:00"`.
 * @throws {TypeError} If `df.index` is not a DatetimeIndex.
 */
export function atTimeDataFrame(df: DataFrame, time: string): DataFrame {
  const positions = atTimePositions(df.index, time);
  return selectRows(df, positions);
}

// ─── betweenTimeSeries ──────────────────────────────────────────────────────────

/**
 * Select rows of `s` whose index label's time-of-day falls within
 * `[startTime, endTime]`.
 *
 * Mirrors `pandas.Series.between_time(start_time, end_time, inclusive)`.
 * When `startTime` is later than `endTime` (e.g. `"18:00"` to `"03:00"`), the
 * window wraps across midnight, matching pandas' behaviour.
 *
 * @param s         - Source Series; its index must consist entirely of `Date` labels.
 * @param startTime - Start of the time-of-day window, e.g. `"09:00"`.
 * @param endTime   - End of the time-of-day window, e.g. `"17:00"`.
 * @param inclusive - Which bound(s) are inclusive (default `"both"`).
 * @throws {TypeError} If `s.index` is not a DatetimeIndex.
 *
 * @example
 * ```ts
 * import { Series, betweenTimeSeries } from "tsb";
 *
 * const idx = [
 *   new Date("2024-01-01T00:00:00Z"),
 *   new Date("2024-01-01T06:00:00Z"),
 *   new Date("2024-01-01T12:00:00Z"),
 * ];
 * const s = new Series({ data: [1, 2, 3], index: idx });
 * betweenTimeSeries(s, "00:00", "06:00").values; // [1, 2]
 * ```
 */
export function betweenTimeSeries<T extends Scalar>(
  s: Series<T>,
  startTime: string,
  endTime: string,
  inclusive: BetweenTimeInclusive = "both",
): Series<T> {
  const positions = betweenTimePositions(s.index, startTime, endTime, inclusive);
  const data = positions.map((i) => s.values[i] as T);
  const labels = positions.map((i) => s.index.at(i));
  return new Series<T>({ data, index: new Index<Label>(labels), dtype: s.dtype, name: s.name });
}

/**
 * Select rows of `df` whose row-index label's time-of-day falls within
 * `[startTime, endTime]`.
 *
 * Mirrors `pandas.DataFrame.between_time(start_time, end_time, inclusive)`.
 *
 * @param df        - Source DataFrame; its index must consist entirely of `Date` labels.
 * @param startTime - Start of the time-of-day window, e.g. `"09:00"`.
 * @param endTime   - End of the time-of-day window, e.g. `"17:00"`.
 * @param inclusive - Which bound(s) are inclusive (default `"both"`).
 * @throws {TypeError} If `df.index` is not a DatetimeIndex.
 */
export function betweenTimeDataFrame(
  df: DataFrame,
  startTime: string,
  endTime: string,
  inclusive: BetweenTimeInclusive = "both",
): DataFrame {
  const positions = betweenTimePositions(df.index, startTime, endTime, inclusive);
  return selectRows(df, positions);
}

// ─── shared DataFrame row-selection helper ────────────────────────────────────

/** Build a new DataFrame containing only the rows at `positions`. */
function selectRows(df: DataFrame, positions: readonly number[]): DataFrame {
  const newIndexLabels = positions.map((i) => df.index.at(i));
  const newIndex = new Index<Label>(newIndexLabels);
  const colNames = df.columns.values as readonly string[];
  const cols = new Map<string, Series<Scalar>>();
  for (const name of colNames) {
    const col = df.col(name);
    const data = positions.map((i) => col.values[i] as Scalar);
    cols.set(name, new Series<Scalar>({ data, index: newIndex, dtype: col.dtype }));
  }
  return new DataFrame(cols, newIndex);
}
