/**
 * lreshape — reshape wide-format data to long format using named column groups.
 *
 * Mirrors `pandas.lreshape(data, groups, dropna=True)`:
 * - `data`: source DataFrame
 * - `groups`: mapping from long-format column name → list of wide-format column names
 * - `dropna`: when `true` (default), drop rows where any value column is `null`/`undefined`/`NaN`
 *
 * Each key in `groups` becomes a column in the output. The values (lists of column
 * names) must all have the same length. The function stacks them vertically such
 * that the first element of each list forms the first block of rows, the second
 * element forms the second block, and so on.
 *
 * All columns in `data` that are **not** mentioned in any group value list become
 * identity (id) columns — they are repeated for each block.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({
 *   hr:   [14, 7],
 *   team: ["Red", "Blue"],
 *   v1:   [1, 3],
 *   v2:   [2, 4],
 * });
 * lreshape(df, { v: ["v1", "v2"] });
 * // hr  team   v
 * // 14  Red    1
 * // 7   Blue   3
 * // 14  Red    2
 * // 7   Blue   4
 * ```
 *
 * @module
 */

import { DataFrame } from "../core/index.ts";
import type { Index } from "../core/index.ts";
import { RangeIndex } from "../core/index.ts";
import type { Label, Scalar } from "../types.ts";

// ─── public types ──────────────────────────────────────────────────────────────

/**
 * Groups argument for {@link lreshape}.
 *
 * Maps each output column name to an ordered list of input column names.
 * All lists must have the same length.
 */
export type LreshapeGroups = Record<string, readonly string[]>;

/** Options for {@link lreshape}. */
export interface LreshapeOptions {
  /**
   * When `true` (default), rows where **any** value column is `null`,
   * `undefined`, or `NaN` are dropped from the result.
   */
  readonly dropna?: boolean;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** True when a scalar is considered missing: null, undefined, or NaN. */
function isMissing(v: Scalar): boolean {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

// ─── lreshape ─────────────────────────────────────────────────────────────────

/**
 * Reshape wide-format data to long format.
 *
 * Each entry in `groups` maps an output column name to a list of input column
 * names that should be stacked into that output column. The input lists must
 * all have the same length `k`; the function produces `nRows * k` output rows.
 *
 * Columns not mentioned in any group value list are treated as id columns and
 * are repeated for every block.
 *
 * @param data    - Source DataFrame (wide format).
 * @param groups  - Mapping from long-format column name → wide-format column list.
 * @param options - {@link LreshapeOptions}
 * @returns A new long-format DataFrame.
 *
 * @example
 * ```ts
 * const df = DataFrame.fromColumns({
 *   A:  ["a", "b"],
 *   B1: [1, 2],
 *   B2: [3, 4],
 * });
 * lreshape(df, { B: ["B1", "B2"] });
 * // A  B
 * // a  1
 * // b  2
 * // a  3
 * // b  4
 * ```
 */
export function lreshape(
  data: DataFrame,
  groups: LreshapeGroups,
  options?: LreshapeOptions,
): DataFrame {
  const dropna = options?.dropna ?? true;

  const groupKeys = Object.keys(groups);

  if (groupKeys.length === 0) {
    // No groups → return a copy with only id columns (same as no value cols)
    return data;
  }

  // Validate: all group lists must have the same length
  const firstKey = groupKeys[0] as string;
  const firstList = groups[firstKey] as readonly string[];
  const k = firstList.length;

  for (const key of groupKeys) {
    const list = groups[key] as readonly string[];
    if (list.length !== k) {
      throw new Error(
        `lreshape: all group lists must have the same length, but ` +
          `"${firstKey}" has length ${k} and "${key}" has length ${list.length}`,
      );
    }
  }

  // Validate: all referenced columns must exist in `data`
  const allGroupCols = new Set<string>();
  for (const key of groupKeys) {
    const list = groups[key] as readonly string[];
    for (const col of list) {
      allGroupCols.add(col);
      if (!data.columns.values.includes(col)) {
        throw new Error(`lreshape: column "${col}" not found in DataFrame`);
      }
    }
  }

  // Determine id columns: all data columns NOT mentioned in any group
  const idCols = data.columns.values.filter((c) => !allGroupCols.has(c));

  const nRows = data.index.size;

  // Output arrays: id columns + group output columns
  const outData: Record<string, Scalar[]> = {};
  for (const id of idCols) {
    outData[id] = [];
  }
  for (const key of groupKeys) {
    outData[key] = [];
  }
  let totalRows = 0;

  // Iterate block by block (one block per position in each group list)
  for (let blockIdx = 0; blockIdx < k; blockIdx++) {
    // For each row in the source
    for (let ri = 0; ri < nRows; ri++) {
      // Collect value-column values for this row in this block
      const blockValues: Scalar[] = [];
      for (const key of groupKeys) {
        const list = groups[key] as readonly string[];
        const srcCol = list[blockIdx] as string;
        const val: Scalar = data.col(srcCol).iat(ri);
        blockValues.push(val);
      }

      // Apply dropna filter
      if (dropna && blockValues.some((v) => isMissing(v))) {
        continue;
      }

      totalRows++;

      // Id columns
      for (const id of idCols) {
        const col = outData[id];
        if (col !== undefined) {
          col.push(data.col(id).iat(ri));
        }
      }

      // Value columns
      for (let vi = 0; vi < groupKeys.length; vi++) {
        const key = groupKeys[vi] as string;
        const col = outData[key];
        if (col !== undefined) {
          const bv = blockValues[vi];
          col.push(bv !== undefined ? bv : null);
        }
      }
    }
  }

  const resultIndex: Index<Label> = new RangeIndex(totalRows) as unknown as Index<Label>;

  return DataFrame.fromColumns(outData, { index: resultIndex });
}
