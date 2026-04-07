/**
 * astype — cast a Series or DataFrame to a specified dtype.
 *
 * Mirrors `pandas.Series.astype(dtype)` and `pandas.DataFrame.astype(dtype)`.
 *
 * Supported casts:
 * - Integer kinds (`int8`, `int16`, `int32`, `int64`, `uint8`, …): values are
 *   truncated toward zero.  Booleans become 0/1.  Strings are parsed with
 *   `Number()`; non-finite results raise `TypeError` when `errors === "raise"`.
 * - Float kinds (`float32`, `float64`): values become IEEE-754 doubles.
 *   `NaN` strings become `NaN`.
 * - `"bool"`: 0, `""`, `"false"`, and `"0"` become `false`; everything else
 *   (including non-zero numbers and non-empty strings) becomes `true`.
 * - `"string"`: `String()` conversion (booleans use Python-style capitalisation:
 *   `"True"` / `"False"`; `null`/`undefined` become `null`).
 * - `"object"`: identity — values are returned unchanged.
 *
 * Null / undefined values are always preserved as `null` regardless of the
 * target dtype.
 *
 * @example
 * ```ts
 * import { Series, astype, dataFrameAstype } from "tsb";
 *
 * const s = new Series({ data: ["1", "2", "3"] });
 * const ints = astype(s, "int64");
 * // ints.values → [1, 2, 3],  ints.dtype.name → "int64"
 *
 * const df = DataFrame.fromColumns({ a: [1, 0, 1], b: ["x", "y", "z"] });
 * const cast = dataFrameAstype(df, { a: "bool" });
 * // cast.col("a").values → [true, false, true]
 * ```
 *
 * @module
 */

import { Dtype } from "./dtype.ts";
import type { DtypeKind } from "./dtype.ts";
import { Series } from "./series.ts";
import { DataFrame } from "./frame.ts";
import type { DtypeName, Scalar } from "../types.ts";

// ─── public types ─────────────────────────────────────────────────────────────

/** What to do when a cast cannot be performed. */
export type AstypeErrors = "raise" | "ignore";

/** Options for {@link astype}. */
export interface AstypeOptions {
  /**
   * How to handle conversion errors.
   * - `"raise"` (default): throw a `TypeError`.
   * - `"ignore"`: leave the value as `null` on failure.
   */
  readonly errors?: AstypeErrors;
}

/**
 * Per-column dtype specification for {@link dataFrameAstype}.
 * Keys are column names; values are dtype names or {@link Dtype} instances.
 */
export type AstypeSpec = DtypeName | Dtype | Record<string, DtypeName | Dtype>;

// ─── internal cast helper ─────────────────────────────────────────────────────

function kindOf(dt: Dtype): DtypeKind {
  return dt.kind;
}

/**
 * Cast a single scalar to the target dtype.
 *
 * Returns `null` if the value is `null`/`undefined`.
 * Throws `TypeError` on impossible conversions (unless overridden by the
 * caller).
 */
function castOne(v: Scalar, dt: Dtype): Scalar {
  if (v === null || v === undefined) return null;

  const kind = kindOf(dt);

  switch (kind) {
    case "int":
    case "uint": {
      if (typeof v === "boolean") return v ? 1 : 0;
      if (typeof v === "number") {
        if (!Number.isFinite(v)) {
          throw new TypeError(
            `Cannot cast non-finite number ${v} to integer dtype "${dt.name}".`,
          );
        }
        return Math.trunc(v);
      }
      if (typeof v === "string") {
        const n = Number(v.trim());
        if (!Number.isFinite(n)) {
          throw new TypeError(
            `Cannot cast string "${v}" to integer dtype "${dt.name}": not a finite number.`,
          );
        }
        return Math.trunc(n);
      }
      if (v instanceof Date) {
        return Math.trunc(v.getTime());
      }
      throw new TypeError(`Cannot cast ${typeof v} value to integer dtype "${dt.name}".`);
    }

    case "float": {
      if (typeof v === "boolean") return v ? 1.0 : 0.0;
      if (typeof v === "number") return v;
      if (typeof v === "string") {
        const trimmed = v.trim();
        if (trimmed.toLowerCase() === "nan") return Number.NaN;
        if (trimmed.toLowerCase() === "inf" || trimmed.toLowerCase() === "infinity")
          return Number.POSITIVE_INFINITY;
        if (trimmed.toLowerCase() === "-inf" || trimmed.toLowerCase() === "-infinity")
          return Number.NEGATIVE_INFINITY;
        const n = Number(trimmed);
        if (Number.isNaN(n)) {
          throw new TypeError(
            `Cannot cast string "${v}" to float dtype "${dt.name}": not a number.`,
          );
        }
        return n;
      }
      if (v instanceof Date) {
        return v.getTime() * 1.0;
      }
      throw new TypeError(`Cannot cast ${typeof v} value to float dtype "${dt.name}".`);
    }

    case "bool": {
      if (typeof v === "boolean") return v;
      if (typeof v === "number") return v !== 0 && !Number.isNaN(v);
      if (typeof v === "string") {
        const lower = v.trim().toLowerCase();
        return lower !== "" && lower !== "0" && lower !== "false";
      }
      throw new TypeError(`Cannot cast ${typeof v} value to bool.`);
    }

    case "string": {
      if (typeof v === "string") return v;
      if (typeof v === "boolean") return v ? "True" : "False";
      if (typeof v === "number") return String(v);
      if (v instanceof Date) return v.toISOString();
      if (typeof v === "bigint") return String(v);
      return String(v);
    }

    case "object":
    case "category":
      return v;

    default:
      throw new TypeError(`Unsupported target dtype "${dt.name}".`);
  }
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Resolve a `DtypeName | Dtype` argument to a {@link Dtype} instance.
 */
function resolveDtype(d: DtypeName | Dtype): Dtype {
  return d instanceof Dtype ? d : Dtype.from(d);
}

/**
 * Cast all values of `series` to `dtype`.
 *
 * @param series  - The source series.
 * @param dtype   - Target dtype name or {@link Dtype} instance.
 * @param options - Optional error-handling behaviour.
 * @returns A new {@link Series} with the cast values and the target dtype.
 *
 * @throws {TypeError} If a value cannot be converted and `errors === "raise"` (the default).
 */
export function astype(
  series: Series<Scalar>,
  dtype: DtypeName | Dtype,
  options?: AstypeOptions,
): Series<Scalar> {
  const dt = resolveDtype(dtype);
  const errors = options?.errors ?? "raise";
  const raw = series.values as readonly Scalar[];
  const out: Scalar[] = new Array<Scalar>(raw.length);

  for (let i = 0; i < raw.length; i++) {
    const v = raw[i];
    if (errors === "raise") {
      out[i] = castOne(v ?? null, dt);
    } else {
      try {
        out[i] = castOne(v ?? null, dt);
      } catch {
        out[i] = null;
      }
    }
  }

  return new Series<Scalar>({
    data: out,
    index: series.index,
    dtype: dt,
    name: series.name,
  });
}

/**
 * Cast columns of `df` to new dtypes.
 *
 * @param df    - The source DataFrame.
 * @param dtype - Either:
 *   - A single `DtypeName | Dtype`: applied to **all** columns.
 *   - A `Record<string, DtypeName | Dtype>`: applied column-by-column.
 *     Columns not present in the record are left unchanged.
 * @param options - Optional error-handling behaviour.
 * @returns A new {@link DataFrame} with cast columns.
 *
 * @throws {RangeError}  If a column named in `dtype` does not exist in `df`.
 * @throws {TypeError}   If a value cannot be converted and `errors === "raise"`.
 */
export function dataFrameAstype(
  df: DataFrame,
  dtype: DtypeName | Dtype | Record<string, DtypeName | Dtype>,
  options?: AstypeOptions,
): DataFrame {
  const cols = df.columns.values as string[];
  const newColMap = new Map<string, Series<Scalar>>();

  if (typeof dtype === "string" || dtype instanceof Dtype) {
    // Single dtype — apply to all columns
    const dt = resolveDtype(dtype);
    for (const col of cols) {
      newColMap.set(col, astype(df.col(col), dt, options));
    }
  } else {
    // Per-column spec
    const spec = dtype as Record<string, DtypeName | Dtype>;
    for (const col of Object.keys(spec)) {
      if (!df.has(col)) {
        throw new RangeError(`dataFrameAstype: column "${col}" not found in DataFrame.`);
      }
    }
    for (const col of cols) {
      const target = spec[col];
      if (target === undefined) {
        // Keep column as-is
        newColMap.set(col, df.col(col));
      } else {
        newColMap.set(col, astype(df.col(col), resolveDtype(target), options));
      }
    }
  }

  return new DataFrame(newColMap, df.index);
}
