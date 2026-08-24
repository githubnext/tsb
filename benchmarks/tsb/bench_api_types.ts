/**
 * Benchmark: api.types predicates — isScalar, isListLike, isNumericDtype, etc.
 * Runs 100,000 checks across value-level and dtype-level predicates.
 */
import { api } from "../../src/index.js";

const WARMUP = 3;
const ITERATIONS = 30;

const values = [42, "hello", true, null, [1, 2, 3], { a: 1 }, new Date(), 3.14, BigInt(99)];
const dtypes = ["int64", "float64", "bool", "object", "string", "datetime64[ns]", "category", "interval"];

function runChecks(): void {
  for (const v of values) {
    api.types.isScalar(v);
    api.types.isListLike(v);
    api.types.isArrayLike(v);
    api.types.isDictLike(v);
    api.types.isNumber(v);
    api.types.isBool(v);
    api.types.isMissing(v);
  }
  for (const d of dtypes) {
    api.types.isNumericDtype(d);
    api.types.isIntegerDtype(d);
    api.types.isFloatDtype(d);
    api.types.isBoolDtype(d);
    api.types.isDatetimeDtype(d);
    api.types.isCategoricalDtype(d);
    api.types.isObjectDtype(d);
  }
}

for (let i = 0; i < WARMUP; i++) {
  runChecks();
}

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  runChecks();
}
const total = performance.now() - start;

console.log(
  JSON.stringify({
    function: "api_types",
    mean_ms: total / ITERATIONS,
    iterations: ITERATIONS,
    total_ms: total,
  }),
);
