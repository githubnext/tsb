/**
 * pd.arrays — Pandas-compatible typed extension arrays for tsb.
 *
 * Mirrors the `pandas.arrays` namespace.  Provides nullable typed arrays for
 * integers, floats, booleans, strings, datetimes, and timedeltas.
 *
 * @example
 * ```ts
 * import { arrays } from "tsb";
 *
 * // Nullable integer array
 * const ints = arrays.IntegerArray.from([1, 2, null, 4], "Int32");
 * ints.toArray();    // [1, 2, null, 4]
 * ints.sum();        // 7
 *
 * // Nullable float array
 * const floats = arrays.FloatingArray.from([1.5, null, 3.0]);
 * floats.mean();     // 2.25
 *
 * // Nullable boolean array (three-valued logic)
 * const bools = arrays.BooleanArray.from([true, false, null]);
 * bools.any();       // true
 *
 * // Nullable string array
 * const strs = arrays.StringArray.from(["hello", null, "world"]);
 * strs.upper().toArray(); // ["HELLO", null, "WORLD"]
 *
 * // Datetime array
 * const dts = arrays.DatetimeArray.from(["2024-01-01", null]);
 * dts.year;          // [2024, null]
 *
 * // Timedelta array
 * const tds = arrays.TimedeltaArray.from([86400000, null]);
 * tds.days;          // [1, null]
 * ```
 *
 * @module
 */

export { MaskedArray } from "./masked_array.ts";
export type { FillValue } from "./masked_array.ts";

export { IntegerArray } from "./integer_array.ts";
export type { IntegerDtypeName } from "./integer_array.ts";

export { FloatingArray } from "./floating_array.ts";
export type { FloatingDtypeName } from "./floating_array.ts";

export { BooleanArray } from "./boolean_array.ts";

export { StringArray } from "./string_array.ts";

export { DatetimeArray } from "./datetime_array.ts";

export { TimedeltaArray } from "./timedelta_array.ts";
