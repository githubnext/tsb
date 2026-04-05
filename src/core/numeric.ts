/**
 * to_numeric — convert scalars or Series values to numeric types.
 *
 * Mirrors `pandas.to_numeric`: coerces an input value or Series to a numeric
 * dtype, with configurable error handling for unparseable values.
 *
 * @example
 * ```ts
 * toNumeric("3.14");        // 3.14
 * toNumeric("abc", "coerce");  // NaN
 * toNumericSeries(series);  // Series<Scalar> with float64 dtype
 * ```
 */

import type { Scalar } from "../types.ts";
import { Dtype } from "./dtype.ts";
import { Series } from "./series.ts";

// ─── error handling modes ─────────────────────────────────────────────────────

/**
 * How to handle values that cannot be converted to a number:
 * - `"raise"` — throw a `TypeError` (default).
 * - `"coerce"` — replace with `NaN`.
 * - `"ignore"` — return the original value unchanged.
 */
export type NumericErrors = "raise" | "coerce" | "ignore";

// ─── options ─────────────────────────────────────────────────────────────────

/** Options for `toNumericSeries`. */
export interface ToNumericOptions {
  /** Error handling strategy (default: `"raise"`). */
  readonly errors?: NumericErrors;
  /**
   * If `true`, attempt to downcast to the smallest numeric dtype that can
   * hold all values without loss (e.g. float64 → int64 if all values are
   * integers).  Default: `false`.
   */
  readonly downcast?: boolean;
}

// ─── scalar conversion ────────────────────────────────────────────────────────

const FLOAT_PATTERN = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

/** Return `true` when `s` looks like a valid decimal number. */
function looksNumeric(s: string): boolean {
  const trimmed = s.trim();
  return (
    trimmed === "nan" || trimmed === "inf" || trimmed === "-inf" || FLOAT_PATTERN.test(trimmed)
  );
}

/** Parse a numeric string known to be non-null/non-empty. */
function parseNumericString(trimmed: string, errors: NumericErrors): number {
  if (trimmed === "nan" || trimmed === "NaN") {
    return Number.NaN;
  }
  if (trimmed === "inf" || trimmed === "Inf" || trimmed === "infinity" || trimmed === "Infinity") {
    return Number.POSITIVE_INFINITY;
  }
  if (
    trimmed === "-inf" ||
    trimmed === "-Inf" ||
    trimmed === "-infinity" ||
    trimmed === "-Infinity"
  ) {
    return Number.NEGATIVE_INFINITY;
  }
  if (!looksNumeric(trimmed)) {
    if (errors === "raise") {
      throw new TypeError(`Unable to convert '${trimmed}' to a numeric type.`);
    }
    return Number.NaN;
  }
  return Number(trimmed);
}

/** Convert a non-string, non-null scalar to a number. */
function nonStringToNumeric(value: Scalar, errors: NumericErrors): number {
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  if (errors === "raise") {
    throw new TypeError(`Unable to convert value of type '${typeof value}' to number.`);
  }
  return Number.NaN;
}

/**
 * Convert a single scalar value to a `number`.
 *
 * @param value  - The value to convert.
 * @param errors - Error handling mode (default: `"raise"`).
 * @returns A `number`, or `NaN`/original value depending on `errors`.
 */
export function toNumeric(value: Scalar, errors: NumericErrors = "raise"): number {
  if (value === null || value === undefined) {
    return Number.NaN;
  }
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") {
      return Number.NaN;
    }
    return parseNumericString(trimmed, errors);
  }
  return nonStringToNumeric(value, errors);
}

// ─── Series conversion ────────────────────────────────────────────────────────

/** Whether all non-NaN numbers are integers. */
function allIntegers(nums: readonly number[]): boolean {
  for (const n of nums) {
    if (!(Number.isNaN(n) || Number.isInteger(n))) {
      return false;
    }
  }
  return true;
}

/**
 * Convert a `Series` to a numeric Series.
 *
 * Each element is passed through `toNumeric`.  When `errors === "ignore"`,
 * non-convertible elements retain their original values.
 *
 * @param series  - Input series.
 * @param options - Conversion options.
 */
export function toNumericSeries(
  series: Series<Scalar>,
  options: ToNumericOptions = {},
): Series<Scalar> {
  const errors: NumericErrors = options.errors ?? "raise";
  const downcast = options.downcast ?? false;

  const converted: Scalar[] = [];
  const origVals = series.values;

  for (const orig of origVals) {
    if (errors === "ignore") {
      try {
        converted.push(toNumeric(orig, "raise"));
      } catch {
        converted.push(orig);
      }
    } else {
      converted.push(toNumeric(orig, errors));
    }
  }

  const nums = converted.filter((v): v is number => typeof v === "number");
  let dtype = Dtype.float64;
  if (downcast && nums.length === converted.length && allIntegers(nums)) {
    dtype = Dtype.int64;
  }

  return new Series({ data: converted, name: series.name ?? null, dtype });
}

// ─── array conversion ─────────────────────────────────────────────────────────

/**
 * Convert an array of scalars to numbers.
 *
 * @param values - Input values.
 * @param errors - Error handling mode (default: `"raise"`).
 */
export function toNumericArray(
  values: readonly Scalar[],
  errors: NumericErrors = "raise",
): number[] {
  return values.map((v) => toNumeric(v, errors));
}
