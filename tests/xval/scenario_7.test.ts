/**
 * Scenario 7 cross-validation: executes real `tsb` operations (not
 * materialized snapshot data) and compares the results against the
 * independently generated `golden/snapshots/scenario_7.json`.
 *
 * Unlike `runner.test.ts`'s scenario replay (which reconstructs "actual"
 * results from the same snapshot it compares against, verifying only
 * materialization), this suite builds inputs from literals copied from
 * `golden/generate.py:scenario_7` and calls the named public `tsb` API for
 * each step. Negative-control tests substitute deliberately wrong operations
 * to prove the assertions actually reject incorrect output.
 *
 * Scope: this covers scenario 7 only (10 of the 60 recorded snapshot steps).
 * It establishes value, missing-value, shape, and ordered-label parity
 * (including numeric-versus-string label type) for those ten steps. It does
 * not establish dtype parity or in-place-mutation parity; the other six
 * scenarios remain materialization-only checks in `runner.test.ts`.
 *
 * Known semantic limits kept explicit rather than normalized away:
 * - tsb infers integer dtype for several of these steps where the pandas
 *   snapshot retains float dtype (see steps 1, 2, 4 vs. snapshot `dtype`).
 *   Dtype metadata itself is not asserted by this suite.
 * - `dataFrameUpdate` (step 3) returns a new DataFrame; it does not mutate
 *   `df1` in place the way `pandas.DataFrame.update` does. This suite only
 *   checks the returned frame's values/shape/labels.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DataFrame, Series } from "tsb";
import type { AlignDataFrameOptions, Scalar } from "tsb";
import type { ScenarioSnapshot, SnapshotStep } from "./helpers.ts";
import type { Scenario7Operations } from "./scenario_7.ts";
import { defaultScenario7Operations, runScenario7 } from "./scenario_7.ts";
import { assertMatchesSnapshotStrict } from "./strict_compare.ts";

const SNAPSHOT_PATH = join(import.meta.dir, "..", "..", "golden", "snapshots", "scenario_7.json");

/**
 * Type guard narrowing an `object` to have all of the given own/inherited
 * property keys, without an `as Record<string, unknown>` cast.
 */
function hasProperties<K extends string>(
  value: object,
  keys: readonly K[],
): value is Record<K, unknown> {
  return keys.every((key) => key in value);
}

/**
 * Structural check that the parsed JSON has the shape of a `ScenarioSnapshot`
 * before it is used as one, avoiding an unchecked `as ScenarioSnapshot` cast
 * on `JSON.parse`'s `unknown` output.
 */
function isScenarioSnapshotShape(value: unknown): value is ScenarioSnapshot {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const requiredKeys: readonly (
    | "snapshotVersion"
    | "scenario"
    | "title"
    | "pandasVersion"
    | "numpyVersion"
    | "steps"
  )[] = ["snapshotVersion", "scenario", "title", "pandasVersion", "numpyVersion", "steps"];
  if (!hasProperties(value, requiredKeys)) {
    return false;
  }
  return (
    typeof value.snapshotVersion === "number" &&
    typeof value.scenario === "string" &&
    typeof value.title === "string" &&
    typeof value.pandasVersion === "string" &&
    typeof value.numpyVersion === "string" &&
    Array.isArray(value.steps) &&
    value.steps.every(
      (step: unknown) =>
        typeof step === "object" &&
        step !== null &&
        hasProperties(step, ["step", "kind"]) &&
        typeof step.step === "number" &&
        typeof step.kind === "string",
    )
  );
}

function assertScenarioSnapshot(value: unknown): ScenarioSnapshot {
  if (!isScenarioSnapshotShape(value)) {
    throw new Error(`${SNAPSHOT_PATH}: parsed JSON does not match the ScenarioSnapshot shape`);
  }
  return value;
}

function loadScenario7Snapshot(): ScenarioSnapshot {
  return assertScenarioSnapshot(JSON.parse(readFileSync(SNAPSHOT_PATH, "utf-8")));
}

function stepFor(snapshot: ScenarioSnapshot, number: number): SnapshotStep {
  const step = snapshot.steps.find((candidate) => candidate.step === number);
  if (step === undefined) {
    throw new Error(`scenario_7 snapshot is missing STEP ${number}`);
  }
  return step;
}

describe("scenario_7: executed operations vs. independent pandas snapshot", () => {
  const snapshot = loadScenario7Snapshot();
  const results = runScenario7();

  it("exercises exactly ten distinct step IDs", () => {
    const stepNumbers = snapshot.steps.map((step) => step.step);
    expect(stepNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(new Set(stepNumbers).size).toBe(10);
  });

  it("STEP 1: combineFirstSeries(a, b) fills NaN from b", () => {
    assertMatchesSnapshotStrict(results[1], stepFor(snapshot, 1));
    expect(results[1] instanceof Series).toBe(true);
  });

  it("STEP 2: combineFirstSeries(combined, c) extends index and fills", () => {
    assertMatchesSnapshotStrict(results[2], stepFor(snapshot, 2));
  });

  it("STEP 3: dataFrameUpdate(df1, df2) returned frame matches updated cells", () => {
    assertMatchesSnapshotStrict(results[3], stepFor(snapshot, 3));
    expect(results[3] instanceof DataFrame).toBe(true);
  });

  it("STEP 4: whereSeries keeps values > 20, replaces others with -1", () => {
    assertMatchesSnapshotStrict(results[4], stepFor(snapshot, 4));
  });

  it("STEP 5: maskSeries zeroes values > 30", () => {
    assertMatchesSnapshotStrict(results[5], stepFor(snapshot, 5));
  });

  it("STEP 6: alignDataFrame outer join, left side gets NaN fill", () => {
    assertMatchesSnapshotStrict(results[6], stepFor(snapshot, 6));
  });

  it("STEP 7: alignDataFrame outer join, right side gets NaN fill", () => {
    assertMatchesSnapshotStrict(results[7], stepFor(snapshot, 7));
  });

  it("STEP 8: alignDataFrame inner join keeps only shared labels (left)", () => {
    assertMatchesSnapshotStrict(results[8], stepFor(snapshot, 8));
  });

  it("STEP 9: alignDataFrame inner join keeps only shared labels (right)", () => {
    assertMatchesSnapshotStrict(results[9], stepFor(snapshot, 9));
  });

  it("STEP 10: combineFirstDataFrame on outer-aligned frames fills all gaps", () => {
    assertMatchesSnapshotStrict(results[10], stepFor(snapshot, 10));
  });

  it("reports scope accurately: one executed scenario, ten executed steps", () => {
    // This suite executes real operations for scenario_7 (10 steps). The other
    // six scenarios (50 steps total) remain materialization-only checks in
    // runner.test.ts and are NOT claimed as verified operation parity here.
    expect(Object.keys(results).length).toBe(10);
  });
});

describe("scenario_7: negative controls (comparison path must reject wrong output)", () => {
  const snapshot = loadScenario7Snapshot();

  it("fails when whereSeries is replaced with a no-op", () => {
    const noopWhere: Scenario7Operations["whereSeries"] = (series) => series;
    const ops: Scenario7Operations = { ...defaultScenario7Operations, whereSeries: noopWhere };
    const results = runScenario7(ops);
    expect(() => assertMatchesSnapshotStrict(results[4], stepFor(snapshot, 4))).toThrow();
  });

  it("fails when alignDataFrame outer join is replaced with a wrong (inner) join", () => {
    const wrongJoinAlign: Scenario7Operations["alignDataFrame"] = (
      left: DataFrame,
      right: DataFrame,
      options?: AlignDataFrameOptions,
    ) => defaultScenario7Operations.alignDataFrame(left, right, { ...options, join: "inner" });
    const ops: Scenario7Operations = {
      ...defaultScenario7Operations,
      alignDataFrame: wrongJoinAlign,
    };
    const results = runScenario7(ops);
    expect(() => assertMatchesSnapshotStrict(results[6], stepFor(snapshot, 6))).toThrow();
  });

  it("fails when alignDataFrame is replaced with a total no-op (identity pass-through)", () => {
    const noopAlign: Scenario7Operations["alignDataFrame"] = (
      left: DataFrame,
      right: DataFrame,
    ) => [left, right];
    const ops: Scenario7Operations = { ...defaultScenario7Operations, alignDataFrame: noopAlign };
    const results = runScenario7(ops);
    expect(() => assertMatchesSnapshotStrict(results[8], stepFor(snapshot, 8))).toThrow();
  });

  it("does not accept returning expected snapshot data in place of computed output", () => {
    // Guards against an executor that simply returns the expected snapshot's
    // own materialized value: use a deliberately wrong maskSeries and confirm
    // the assertion fails rather than silently matching pre-baked data.
    const wrongMask: Scenario7Operations["maskSeries"] = (series) => series;
    const ops: Scenario7Operations = { ...defaultScenario7Operations, maskSeries: wrongMask };
    const results = runScenario7(ops);
    expect(() => assertMatchesSnapshotStrict(results[5], stepFor(snapshot, 5))).toThrow();
  });
});

describe("scenario_7: comparator regression — numeric label must not equal string label", () => {
  it('rejects a Series whose index label is the number 1 against a snapshot expecting the string "1"', () => {
    // Both labels stringify identically ("1"), so a comparator that keys by
    // `String(label)` alone (without preserving the original type) would
    // wrongly accept this as a match. `assertMatchesSnapshotStrict` must reject it.
    const numericLabeled = new Series<Scalar>({ data: [42], index: [1] });
    const stepExpectingStringLabel: SnapshotStep = {
      step: 9001,
      kind: "series",
      operation: 'comparator regression: string label "1"',
      shape: [1],
      dtype: "integer",
      name: { kind: "NaN" },
      index: { kind: "index", dtype: "string", name: null, values: ["1"] },
      data: [42],
    };

    expect(() => assertMatchesSnapshotStrict(numericLabeled, stepExpectingStringLabel)).toThrow();

    // Control: a string-labeled Series with the same label text is accepted.
    const stringLabeled = new Series<Scalar>({ data: [42], index: ["1"] });
    expect(() =>
      assertMatchesSnapshotStrict(stringLabeled, stepExpectingStringLabel),
    ).not.toThrow();
  });
});

describe("scenario_7: comparator regression — Series shape mismatch must be rejected", () => {
  it("rejects a length-5 actual Series with a matching index against a step declaring shape [999]", () => {
    // A comparator that never checks `step.shape` for the Series branch could
    // pass a wrong-length actual Series as long as its index values happen to
    // line up positionally. This probe uses an index that matches
    // `actual.index` exactly (so index/value assertions alone would not
    // catch the mismatch) but declares an unrelated `step.shape` of `[999]`.
    const actual = new Series<Scalar>({ data: [1, 2, 3, 4, 5], index: [0, 1, 2, 3, 4] });
    const stepWithWrongShape: SnapshotStep = {
      step: 9002,
      kind: "series",
      operation: "comparator regression: Series shape mismatch",
      shape: [999],
      dtype: "integer",
      name: { kind: "NaN" },
      index: { kind: "index", dtype: "integer", name: null, values: [0, 1, 2, 3, 4] },
      data: [1, 2, 3, 4, 5],
    };

    expect(() => assertMatchesSnapshotStrict(actual, stepWithWrongShape)).toThrow();

    // Control: the same actual Series with the correct declared shape passes.
    const stepWithCorrectShape: SnapshotStep = { ...stepWithWrongShape, shape: [5] };
    expect(() => assertMatchesSnapshotStrict(actual, stepWithCorrectShape)).not.toThrow();
  });
});

describe("scenario_7: comparator regression — bigint/duration must not be coerced into a plain number", () => {
  const numericStep: SnapshotStep = {
    step: 9003,
    kind: "series",
    operation: "nonmissing value regression",
    shape: [1],
    dtype: "integer",
    name: { kind: "NaN" },
    index: { kind: "index", dtype: "string", name: null, values: ["x"] },
    data: [9007199254740992],
  };

  it("does not round a different bigint into the expected number", () => {
    // 9007199254740993n is exactly one past Number.MAX_SAFE_INTEGER, which
    // rounds to 9007199254740992 (the snapshot's expected value) if coerced
    // through `Number(...)`. Coercion would erase that one-off difference
    // before the tolerance check runs; tagging bigints instead of coercing
    // them keeps this a genuine mismatch.
    const actual = new Series<Scalar>({ data: [9007199254740993n], index: ["x"] });
    expect(() => assertMatchesSnapshotStrict(actual, numericStep)).toThrow();
  });

  it("does not turn a duration object into a numeric value", () => {
    // A TimedeltaLike ({ totalMs: 1 }) is a structurally distinct value from
    // the plain number `1`; collapsing it to `value.totalMs` before
    // comparison would wrongly accept it as a match.
    const actual = new Series<Scalar>({ data: [{ totalMs: 1 }], index: ["x"] });
    const stepExpectingOne: SnapshotStep = { ...numericStep, data: [1] };
    expect(() => assertMatchesSnapshotStrict(actual, stepExpectingOne)).toThrow();
  });
});
