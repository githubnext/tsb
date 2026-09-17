/**
 * scenario_7 executor — builds scenario_7's original inputs (copied
 * independently from `golden/generate.py:scenario_7`) and runs them through
 * the real public `tsb` API. No snapshot data, snapshot import, or file read
 * is referenced here; the only shared knowledge with the golden generator is
 * the literal input values.
 *
 * @module
 */

import {
  DataFrame,
  Series,
  alignDataFrame,
  combineFirstDataFrame,
  combineFirstSeries,
  dataFrameUpdate,
  maskSeries,
  whereSeries,
} from "tsb";
import type { AlignDataFrameOptions } from "tsb";
import type { Scalar } from "tsb";

/** Result kinds produced by {@link runScenario7}, keyed by snapshot step number. */
export interface Scenario7Results {
  readonly 1: Series<Scalar>;
  readonly 2: Series<Scalar>;
  readonly 3: DataFrame;
  readonly 4: Series<Scalar>;
  readonly 5: Series<Scalar>;
  readonly 6: DataFrame;
  readonly 7: DataFrame;
  readonly 8: DataFrame;
  readonly 9: DataFrame;
  readonly 10: DataFrame;
}

/** Injectable operation set so negative-control tests can substitute faulty logic. */
export interface Scenario7Operations {
  readonly combineFirstSeries: typeof combineFirstSeries;
  readonly combineFirstDataFrame: typeof combineFirstDataFrame;
  readonly dataFrameUpdate: typeof dataFrameUpdate;
  readonly whereSeries: typeof whereSeries;
  readonly maskSeries: typeof maskSeries;
  readonly alignDataFrame: (
    left: DataFrame,
    right: DataFrame,
    options?: AlignDataFrameOptions,
  ) => [DataFrame, DataFrame];
}

/** Production defaults: the real `tsb` public API, no test doubles. */
export const defaultScenario7Operations: Scenario7Operations = {
  combineFirstSeries,
  combineFirstDataFrame,
  dataFrameUpdate,
  whereSeries,
  maskSeries,
  alignDataFrame,
};

/**
 * Execute scenario 7's ten steps against real `tsb` operations, starting from
 * inputs copied independently from `golden/generate.py:scenario_7`.
 *
 * @param ops - Operation set to invoke; defaults to the real public tsb API.
 *   Tests may inject deliberately incorrect operations to prove the
 *   comparison path actually rejects wrong output (negative controls).
 */
export function runScenario7(
  ops: Scenario7Operations = defaultScenario7Operations,
): Scenario7Results {
  // STEP 1-2: combine_first fills NaN from another Series, then chains.
  const a = new Series<Scalar>({ data: [1, 2, null, 4, 5], index: ["a", "b", "c", "d", "e"] });
  const b = new Series<Scalar>({
    data: [10, null, 30, null, 50],
    index: ["a", "b", "c", "d", "e"],
  });
  const c = new Series<Scalar>({ data: [100, 200, 300], index: ["c", "d", "f"] });
  const combined = ops.combineFirstSeries(a, b);
  const combined2 = ops.combineFirstSeries(combined, c);

  // STEP 3: update modifies matching indices from another DataFrame.
  const df1 = DataFrame.fromColumns(
    { x: [1, 2, 3, 4, 5], y: [10, 20, 30, 40, 50] },
    { index: [0, 1, 2, 3, 4] },
  );
  const df2 = DataFrame.fromColumns({ x: [100, 200], y: [1000, 2000] }, { index: [1, 3] });
  const updated = ops.dataFrameUpdate(df1, df2);

  // STEP 4-5: where keeps values > 20; mask zeroes values > 30.
  const s = new Series<Scalar>({ data: [10, 20, 30, 40, 50], index: ["a", "b", "c", "d", "e"] });
  const masked = ops.whereSeries(s, (value) => typeof value === "number" && value > 20, {
    other: -1,
  });
  const masked2 = ops.maskSeries(s, (value) => typeof value === "number" && value > 30, {
    other: 0,
  });

  // STEP 6-7: align outer produces a union index with NaN fill on both sides.
  const left = DataFrame.fromColumns({ A: [1, 2, 3] }, { index: ["a", "b", "c"] });
  const right = DataFrame.fromColumns({ A: [10, 20, 30] }, { index: ["b", "c", "d"] });
  const [alignedLeft, alignedRight] = ops.alignDataFrame(left, right, { join: "outer" });

  // STEP 8-9: align inner keeps only shared labels on both sides.
  const [innerLeft, innerRight] = ops.alignDataFrame(left, right, { join: "inner" });

  // STEP 10: combine_first on the outer-aligned frames fills all remaining gaps.
  const result = ops.combineFirstDataFrame(alignedLeft, alignedRight);

  return {
    1: combined,
    2: combined2,
    3: updated,
    4: masked,
    5: masked2,
    6: alignedLeft,
    7: alignedRight,
    8: innerLeft,
    9: innerRight,
    10: result,
  };
}
