import { expect } from "bun:test";
import { DataFrame, Series } from "tsb";
import type { Label, Scalar } from "tsb";

const FLOAT_TOLERANCE = 1e-10;

type EncodedNaN = { readonly kind: "NaN" };
type JsonValue = null | boolean | number | string | EncodedNaN | readonly JsonValue[];

export interface SnapshotIndex {
  readonly kind: "index" | "multiindex";
  readonly name?: string | null;
  readonly names?: readonly (string | null)[];
  readonly dtype: string;
  readonly values: readonly JsonValue[];
}

export interface SnapshotStep {
  readonly step: number;
  readonly kind: "dataframe" | "series" | "scalar";
  readonly operation: string;
  readonly shape?: readonly number[];
  readonly index?: SnapshotIndex;
  readonly columns?: SnapshotIndex;
  readonly dtypes?: Readonly<Record<string, string>>;
  readonly dtype?: string;
  readonly name?: JsonValue;
  readonly data?: readonly (readonly JsonValue[])[] | readonly JsonValue[];
  readonly value?: JsonValue;
  readonly categoricals?: Readonly<Record<string, unknown>>;
}

export interface ScenarioSnapshot {
  readonly snapshotVersion: number;
  readonly scenario: string;
  readonly title: string;
  readonly pandasVersion: string;
  readonly numpyVersion: string;
  readonly steps: readonly SnapshotStep[];
}

export type TsbResult = DataFrame | Series<Scalar> | Scalar;

export function materializeSnapshotStep(step: SnapshotStep): TsbResult {
  if (step.kind === "dataframe") {
    const rows = expectMatrix(step);
    const columns = labelKeys(expectIndex(step.columns).values);
    const index = labelKeys(expectIndex(step.index).values) as Label[];
    const data: Record<string, Scalar[]> = {};
    for (const [colPos, colName] of columns.entries()) {
      data[colName] = rows.map((row) => decodeScalar(row[colPos] ?? null));
    }
    return DataFrame.fromColumns(data, { index });
  }
  if (step.kind === "series") {
    const values = expectVector(step).map((value) => decodeScalar(value));
    const index = labelKeys(expectIndex(step.index).values) as Label[];
    return new Series({ data: values, index, name: labelKey(step.name ?? null) });
  }
  return decodeScalar(step.value ?? null);
}

export function assertMatchesSnapshot(actual: TsbResult, step: SnapshotStep): void {
  if (step.kind === "dataframe") {
    if (!(actual instanceof DataFrame)) {
      throw new Error(`STEP ${step.step}: expected a DataFrame result`);
    }
    assertDataFrameMatchesSnapshot(actual, step);
    return;
  }
  if (step.kind === "series") {
    if (!(actual instanceof Series)) {
      throw new Error(`STEP ${step.step}: expected a Series result`);
    }
    assertSeriesMatchesSnapshot(actual, step);
    return;
  }
  assertJsonEqual(
    encodeRuntimeScalar(actual as Scalar),
    step.value ?? null,
    `STEP ${step.step} scalar`,
  );
}

function assertDataFrameMatchesSnapshot(actual: DataFrame, step: SnapshotStep): void {
  const expectedRows = expectMatrix(step);
  const expectedColumns = labelKeys(expectIndex(step.columns).values);
  const expectedIndex = labelKeys(expectIndex(step.index).values);
  expect([...actual.shape]).toEqual([...(step.shape ?? [])]);
  expect([...actual.columns.values]).toEqual(expectedColumns);
  expect([...actual.index.values]).toEqual(expectedIndex);
  const actualRows = actual.toArray();
  expect(actualRows.length).toBe(expectedRows.length);
  for (let row = 0; row < expectedRows.length; row++) {
    const actualRow = actualRows[row];
    const expectedRow = expectedRows[row];
    expect(actualRow?.length).toBe(expectedRow?.length);
    for (let col = 0; col < expectedColumns.length; col++) {
      assertJsonEqual(
        encodeRuntimeScalar(actualRow?.[col] as Scalar),
        expectedRow?.[col] ?? null,
        `STEP ${step.step} [${row}, ${col}]`,
      );
    }
  }
  expect(Object.keys(step.dtypes ?? {}).length).toBe(expectedColumns.length);
}

function assertSeriesMatchesSnapshot(actual: Series<Scalar>, step: SnapshotStep): void {
  const expectedValues = expectVector(step);
  const expectedIndex = labelKeys(expectIndex(step.index).values);
  expect([...actual.index.values]).toEqual(expectedIndex);
  expect(actual.values.length).toBe(expectedValues.length);
  for (let pos = 0; pos < expectedValues.length; pos++) {
    assertJsonEqual(
      encodeRuntimeScalar(actual.values[pos] as Scalar),
      expectedValues[pos] ?? null,
      `STEP ${step.step} [${pos}]`,
    );
  }
  expect(step.dtype).toBeDefined();
}

function expectIndex(index: SnapshotIndex | undefined): SnapshotIndex {
  if (index === undefined) {
    throw new Error("Snapshot is missing index metadata");
  }
  return index;
}

function expectMatrix(step: SnapshotStep): readonly (readonly JsonValue[])[] {
  if (!Array.isArray(step.data) || (step.data.length > 0 && !Array.isArray(step.data[0]))) {
    throw new Error(`STEP ${step.step}: expected matrix data`);
  }
  return step.data as readonly (readonly JsonValue[])[];
}

function expectVector(step: SnapshotStep): readonly JsonValue[] {
  if (!Array.isArray(step.data) || (step.data.length > 0 && Array.isArray(step.data[0]))) {
    throw new Error(`STEP ${step.step}: expected vector data`);
  }
  return step.data as readonly JsonValue[];
}

function decodeScalar(value: JsonValue): Scalar {
  if (isEncodedNaN(value)) {
    return Number.NaN;
  }
  if (Array.isArray(value)) {
    return value.map((item) => decodeScalar(item)) as unknown as Scalar;
  }
  return value as Scalar;
}

function encodeRuntimeScalar(value: Scalar): JsonValue {
  if (value === null || value === undefined || (typeof value === "number" && Number.isNaN(value))) {
    return { kind: "NaN" };
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map((item) => encodeRuntimeScalar(item as Scalar));
  }
  return value as JsonValue;
}

function isEncodedNaN(value: JsonValue): value is EncodedNaN {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    (value as EncodedNaN).kind === "NaN"
  );
}

function labelKeys(values: readonly JsonValue[]): string[] {
  return values.map((value) => labelKey(value));
}

function labelKey(value: JsonValue): string {
  if (isEncodedNaN(value)) {
    return "NaN";
  }
  if (Array.isArray(value)) {
    return JSON.stringify(value.map((item) => (isEncodedNaN(item) ? "NaN" : item)));
  }
  return String(value);
}

function assertJsonEqual(actual: JsonValue, expected: JsonValue, context: string): void {
  if (isEncodedNaN(actual) && isEncodedNaN(expected)) {
    return;
  }
  if (Array.isArray(actual) || Array.isArray(expected)) {
    expect(Array.isArray(actual), context).toBe(true);
    expect(Array.isArray(expected), context).toBe(true);
    const actualArray = actual as readonly JsonValue[];
    const expectedArray = expected as readonly JsonValue[];
    expect(actualArray.length, context).toBe(expectedArray.length);
    for (let i = 0; i < expectedArray.length; i++) {
      assertJsonEqual(actualArray[i] ?? null, expectedArray[i] ?? null, `${context}.${i}`);
    }
    return;
  }
  if (typeof actual === "number" && typeof expected === "number") {
    expect(Math.abs(actual - expected), context).toBeLessThanOrEqual(FLOAT_TOLERANCE);
    return;
  }
  expect(actual, context).toEqual(expected);
}
