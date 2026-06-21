/**
 * Benchmark: convertDtypesSeries and convertDtypesDataFrame
 *
 * Mirrors pandas Series.convert_dtypes() and DataFrame.convert_dtypes().
 * Creates a 50k-row dataset with object-typed numeric, boolean, and string
 * columns, then measures how fast tsb can infer and convert to best dtypes.
 */
import { Series, DataFrame, convertDtypesSeries, convertDtypesDataFrame } from "../../src/index.ts";
import type { Scalar } from "../../src/types.ts";

const N = 50_000;
const WARMUP = 3;
const ITERATIONS = 20;

// Object-dtype series: integers stored as Scalars (no typed array)
const intData: Scalar[] = Array.from({ length: N }, (_, i) => (i % 17 === 0 ? null : i));
const floatData: Scalar[] = Array.from({ length: N }, (_, i) => (i % 13 === 0 ? null : i * 1.5));
const strData: Scalar[] = Array.from({ length: N }, (_, i) => (i % 11 === 0 ? null : `str_${i}`));
const boolData: Scalar[] = Array.from({ length: N }, (_, i) => (i % 7 === 0 ? null : i % 2 === 0));

const intSeries = new Series<Scalar>({ data: intData });
const floatSeries = new Series<Scalar>({ data: floatData });

const df = DataFrame.fromColumns({
  int_col: intData,
  float_col: floatData,
  str_col: strData,
  bool_col: boolData,
});

// Warm-up
for (let i = 0; i < WARMUP; i++) {
  convertDtypesSeries(intSeries);
  convertDtypesSeries(floatSeries);
  convertDtypesDataFrame(df);
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  convertDtypesSeries(intSeries);
  convertDtypesSeries(floatSeries);
  convertDtypesDataFrame(df);
}
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "convert_dtypes",
    mean_ms: total_ms / ITERATIONS,
    iterations: ITERATIONS,
    total_ms,
  }),
);
