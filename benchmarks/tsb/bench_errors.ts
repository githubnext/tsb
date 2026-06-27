/**
 * Benchmark: pd.errors namespace — instantiate and inspect pandas-compatible error classes.
 *
 * Covers the `errors` namespace from tsb:
 *   - errors.ValueError, errors.KeyError, errors.IndexError (base classes)
 *   - errors.EmptyDataError, errors.MergeError, errors.OptionError
 *   - errors.IntCastingNaNError, errors.UnsortedIndexError
 *   - errors.ParserError, errors.PerformanceWarning, errors.InvalidIndexError
 *   - instanceof checks and .name/.message property access
 *
 * Outputs JSON: {"function": "errors", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { errors } from "../../src/index.ts";

const WARMUP = 5;
const ITERATIONS = 200;

function run(): void {
  const e1 = new errors.ValueError("bad value");
  const e2 = new errors.KeyError("missing key");
  const e3 = new errors.MergeError("incompatible merge");
  const e4 = new errors.EmptyDataError("no data");
  const e5 = new errors.OptionError("unknown option");
  const e6 = new errors.IntCastingNaNError();
  const e7 = new errors.UnsortedIndexError();
  const e8 = new errors.ParserError("unexpected token");
  const e9 = new errors.PerformanceWarning("slow path");
  const e10 = new errors.InvalidIndexError("bad index");

  const _a = e1 instanceof errors.ValueError;
  const _b = e2 instanceof errors.KeyError;
  const _c = e3 instanceof Error;
  const _d = e4.name === "EmptyDataError";
  const _e = e5.message.includes("unknown");
  const _f = e6 instanceof errors.IntCastingNaNError;
  const _g = e7 instanceof errors.UnsortedIndexError;
  const _h = e8.name === "ParserError";
  const _i = e9.name === "PerformanceWarning";
  const _j = e10 instanceof errors.InvalidIndexError;
  void [_a, _b, _c, _d, _e, _f, _g, _h, _i, _j];
}

for (let i = 0; i < WARMUP; i++) run();

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) run();
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "errors",
    mean_ms: total_ms / ITERATIONS,
    iterations: ITERATIONS,
    total_ms,
  }),
);
