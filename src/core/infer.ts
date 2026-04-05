/**
 * infer_objects / convert_dtypes — dtype inference and conversion utilities.
 *
 * Mirrors pandas' `infer_objects()`, `convert_dtypes()` and `api.types`
 * type-checking helpers.
 *
 * @module
 */

import type { Scalar } from "../types.ts";
import { Dtype } from "./dtype.ts";
import { DataFrame } from "./frame.ts";
import { Series } from "./series.ts";

// ─── helpers ─────────────────────────────────────────────────────────────────

function isBoolArray(arr: readonly Scalar[]): boolean {
  for (const v of arr) {
    if (v === null) {
      continue;
    }
    if (typeof v !== "boolean") {
      return false;
    }
  }
  return true;
}

function isIntArray(arr: readonly Scalar[]): boolean {
  for (const v of arr) {
    if (v === null) {
      continue;
    }
    if (typeof v !== "number" || !Number.isFinite(v) || !Number.isInteger(v)) {
      return false;
    }
  }
  return true;
}

function isNumericArray(arr: readonly Scalar[]): boolean {
  for (const v of arr) {
    if (v === null) {
      continue;
    }
    if (typeof v !== "number" || !Number.isFinite(v)) {
      return false;
    }
  }
  return true;
}

function isStringArray(arr: readonly Scalar[]): boolean {
  for (const v of arr) {
    if (v === null) {
      continue;
    }
    if (typeof v !== "string") {
      return false;
    }
  }
  return true;
}

// ─── inferDtype ───────────────────────────────────────────────────────────────

/**
 * Infer the most specific Dtype for an array of scalars.
 *
 * Priority: bool > int64 > float64 > string > object
 */
export function inferDtype(values: readonly Scalar[]): Dtype {
  if (isBoolArray(values)) {
    return Dtype.bool;
  }
  if (isIntArray(values)) {
    return Dtype.int64;
  }
  if (isNumericArray(values)) {
    return Dtype.float64;
  }
  if (isStringArray(values)) {
    return Dtype.string;
  }
  return Dtype.object;
}

// ─── inferObjects ─────────────────────────────────────────────────────────────

/**
 * Attempt to infer a better dtype for an object-dtype Series.
 *
 * Mirrors `pandas.Series.infer_objects()`.
 */
export function inferObjects(series: Series<Scalar>): Series<Scalar> {
  if (series.dtype !== Dtype.object) {
    return series;
  }
  const vals = series.values as readonly Scalar[];
  const dtype = inferDtype(vals);
  return new Series<Scalar>({ data: vals, name: series.name, index: series.index, dtype });
}

/** Apply `inferObjects` to every object-dtype column of a DataFrame. */
export function inferObjectsDataFrame(df: DataFrame): DataFrame {
  const cols: Record<string, readonly Scalar[]> = {};
  for (const col of df.columns.values) {
    if (typeof col !== "string") {
      continue;
    }
    const s = df.get(col);
    if (s !== undefined) {
      const inferred = inferObjects(s as Series<Scalar>);
      cols[col] = inferred.values as readonly Scalar[];
    }
  }
  return DataFrame.fromColumns(cols);
}

// ─── convertDtypes ────────────────────────────────────────────────────────────

/** Options for `convertDtypes`. */
export interface ConvertDtypesOptions {
  /** Convert integers to float when nulls are present (default false). */
  convertIntegerToFloat?: boolean;
  /** Attempt to parse string columns as numbers (default false). */
  convertStringToNumeric?: boolean;
}

/**
 * Convert a Series to its best possible dtype.
 *
 * Mirrors `pandas.Series.convert_dtypes()`.
 */
export function convertDtypes(
  series: Series<Scalar>,
  options: ConvertDtypesOptions = {},
): Series<Scalar> {
  let vals: readonly Scalar[] = series.values as readonly Scalar[];

  if (options.convertStringToNumeric === true && isStringArray(vals)) {
    vals = vals.map((v) => {
      if (v === null) {
        return null;
      }
      const n = Number(v as string);
      return Number.isNaN(n) ? v : n;
    });
  }

  const dtype = inferDtype(vals);

  if (options.convertIntegerToFloat === true && dtype === Dtype.int64) {
    const hasNull = vals.some((v) => v === null);
    return new Series<Scalar>({
      data: vals,
      name: series.name,
      index: series.index,
      dtype: hasNull ? Dtype.float64 : Dtype.int64,
    });
  }

  return new Series<Scalar>({ data: vals, name: series.name, index: series.index, dtype });
}

/** Apply `convertDtypes` to all columns of a DataFrame. */
export function convertDtypesDataFrame(
  df: DataFrame,
  options: ConvertDtypesOptions = {},
): DataFrame {
  const cols: Record<string, readonly Scalar[]> = {};
  for (const col of df.columns.values) {
    if (typeof col !== "string") {
      continue;
    }
    const s = df.get(col);
    if (s !== undefined) {
      const converted = convertDtypes(s as Series<Scalar>, options);
      cols[col] = converted.values as readonly Scalar[];
    }
  }
  return DataFrame.fromColumns(cols);
}

// ─── type-checking predicates ─────────────────────────────────────────────────

/** Return true if the Series has a numeric dtype (int64 or float64). */
export function isNumericDtype(series: Series<Scalar>): boolean {
  return series.dtype === Dtype.int64 || series.dtype === Dtype.float64;
}

/** Return true if the Series has a string dtype. */
export function isStringDtype(series: Series<Scalar>): boolean {
  return series.dtype === Dtype.string;
}

/** Return true if the Series has a boolean dtype. */
export function isBoolDtype(series: Series<Scalar>): boolean {
  return series.dtype === Dtype.bool;
}

/** Return true if the Series has an object dtype. */
export function isObjectDtype(series: Series<Scalar>): boolean {
  return series.dtype === Dtype.object;
}

/** Return true if the Series has an integer dtype. */
export function isIntegerDtype(series: Series<Scalar>): boolean {
  return series.dtype === Dtype.int64;
}

/** Return true if the Series has a float dtype. */
export function isFloatDtype(series: Series<Scalar>): boolean {
  return series.dtype === Dtype.float64;
}
