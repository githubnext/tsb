/**
 * Benchmark: pd.errors namespace (extended) — remaining pandas-compatible
 * error/warning classes not covered by bench_errors.ts.
 *
 * Covers 23 additional classes from tsb's `errors` namespace:
 *   - errors.AbstractMethodError, errors.AccessorRegistrationWarning
 *   - errors.AttributeConflictWarning, errors.CSSWarning
 *   - errors.ChainedAssignmentError, errors.DatabaseError
 *   - errors.DtypeWarning, errors.DuplicateLabelError
 *   - errors.InvalidColumnName, errors.InvalidComparison
 *   - errors.InvalidUseOfBooleanIndex, errors.InvalidVersion
 *   - errors.LossySetitemError, errors.NullFrequencyError
 *   - errors.NumbaUtilError, errors.OutOfBoundsDatetime
 *   - errors.OutOfBoundsTimedelta, errors.ParserWarning
 *   - errors.PossibleDataLossError, errors.PossiblePrecisionLoss
 *   - errors.SpecificationError, errors.UnsupportedFunctionCall
 *   - errors.ValueLabelTypeMismatch
 *   - instanceof checks and .name/.message property access
 *
 * Outputs JSON: {"function": "errors_extended", "mean_ms": ..., "iterations": ..., "total_ms": ...}
 */
import { errors } from "../../src/index.ts";

const WARMUP = 5;
const ITERATIONS = 200;

function run(): void {
  const e1 = new errors.AbstractMethodError("MyClass");
  const e2 = new errors.AccessorRegistrationWarning("shadowed accessor");
  const e3 = new errors.AttributeConflictWarning("conflicting attribute");
  const e4 = new errors.CSSWarning("bad css rule");
  const e5 = new errors.ChainedAssignmentError();
  const e6 = new errors.DatabaseError("connection failed");
  const e7 = new errors.DtypeWarning("mismatched dtypes");
  const e8 = new errors.DuplicateLabelError();
  const e9 = new errors.InvalidColumnName("bad column");
  const e10 = new errors.InvalidComparison("incompatible types");
  const e11 = new errors.InvalidUseOfBooleanIndex("bad boolean index");
  const e12 = new errors.InvalidVersion("not.a.version");
  const e13 = new errors.LossySetitemError("would lose precision");
  const e14 = new errors.NullFrequencyError();
  const e15 = new errors.NumbaUtilError("numba failure");
  const e16 = new errors.OutOfBoundsDatetime();
  const e17 = new errors.OutOfBoundsTimedelta();
  const e18 = new errors.ParserWarning("falling back to python engine");
  const e19 = new errors.PossibleDataLossError("mode='w' will overwrite");
  const e20 = new errors.PossiblePrecisionLoss("float64 -> float32");
  const e21 = new errors.SpecificationError("nested renamer is not supported");
  const e22 = new errors.UnsupportedFunctionCall("numpy operation not supported");
  const e23 = new errors.ValueLabelTypeMismatch("mismatched value/label types");

  const _a = e1 instanceof Error;
  const _b = e2 instanceof errors.AccessorRegistrationWarning;
  const _c = e3.name === "AttributeConflictWarning";
  const _d = e4.name === "CSSWarning";
  const _e = e5.message.includes("copy");
  const _f = e6 instanceof errors.DatabaseError;
  const _g = e7.name === "DtypeWarning";
  const _h = e8 instanceof errors.ValueError;
  const _i = e9.name === "InvalidColumnName";
  const _j = e10 instanceof TypeError;
  const _k = e11 instanceof errors.IndexError;
  const _l = e12 instanceof errors.ValueError;
  const _m = e13.name === "LossySetitemError";
  const _n = e14 instanceof errors.ValueError;
  const _o = e15.name === "NumbaUtilError";
  const _p = e16 instanceof errors.ValueError;
  const _q = e17 instanceof errors.ValueError;
  const _r = e18.name === "ParserWarning";
  const _s = e19.name === "PossibleDataLossError";
  const _t = e20.name === "PossiblePrecisionLoss";
  const _u = e21 instanceof errors.ValueError;
  const _v = e22 instanceof errors.ValueError;
  const _w = e23.name === "ValueLabelTypeMismatch";
  void [
    _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w,
  ];
}

for (let i = 0; i < WARMUP; i++) run();

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) run();
const total_ms = performance.now() - start;

console.log(
  JSON.stringify({
    function: "errors_extended",
    mean_ms: total_ms / ITERATIONS,
    iterations: ITERATIONS,
    total_ms,
  }),
);
