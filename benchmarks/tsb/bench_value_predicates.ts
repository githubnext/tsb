/**
 * Benchmark: value-level predicate functions from pandas.api.types —
 * isScalar, isListLike, isArrayLike, isDictLike, isIterator,
 * isNumber, isBool, isFloat, isInteger, isMissing, isHashable, isDate
 */
import {
  isScalar,
  isListLike,
  isArrayLike,
  isDictLike,
  isIterator,
  isNumber,
  isBool,
  isFloat,
  isInteger,
  isMissing,
  isHashable,
  isDate,
} from "../../src/index.js";

const WARMUP = 5;
const ITERATIONS = 5_000;

// Representative mixed values
const values: unknown[] = [
  42,
  3.14,
  true,
  false,
  "hello",
  null,
  undefined,
  [1, 2, 3],
  { a: 1 },
  new Date(),
  new Map(),
  new Set(),
  Symbol("x"),
  42n,
  NaN,
];

function runChecks(): void {
  for (const v of values) {
    isScalar(v);
    isListLike(v);
    isArrayLike(v);
    isDictLike(v);
    isIterator(v);
    isNumber(v);
    isBool(v);
    isFloat(v);
    isInteger(v);
    isMissing(v);
    isHashable(v);
    isDate(v);
  }
}

for (let i = 0; i < WARMUP; i++) runChecks();

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) runChecks();
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "value_predicates",
    mean_ms: total_ms / ITERATIONS,
    iterations: ITERATIONS,
    total_ms,
  }),
);
