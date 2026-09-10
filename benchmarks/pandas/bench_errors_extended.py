"""
Benchmark: pd.errors namespace (extended) — remaining pandas-compatible
error/warning classes not covered by bench_errors.py.

Mirrors tsb's `errors` namespace additions: AbstractMethodError,
AccessorRegistrationWarning, AttributeConflictWarning, CSSWarning,
ChainedAssignmentError, DatabaseError, DtypeWarning, DuplicateLabelError,
InvalidColumnName, InvalidComparison, InvalidUseOfBooleanIndex,
InvalidVersion, LossySetitemError, NullFrequencyError, NumbaUtilError,
OutOfBoundsDatetime, OutOfBoundsTimedelta, ParserWarning,
PossibleDataLossError, PossiblePrecisionLoss, SpecificationError,
UnsupportedFunctionCall, ValueLabelTypeMismatch.

A handful of these names (InvalidColumnName, InvalidUseOfBooleanIndex,
LossySetitemError, ValueLabelTypeMismatch) are tsb-specific extensions with
no direct `pandas.errors` counterpart across all pandas versions, so a local
fallback class is used for those to keep the benchmark portable.

Outputs JSON: {"function": "errors_extended", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""

import json
import time

import pandas.errors as pd_errors


class _FallbackError(ValueError):
    """Local stand-in for tsb-only error classes with no pandas.errors match."""


InvalidColumnName = getattr(pd_errors, "InvalidColumnName", _FallbackError)
InvalidUseOfBooleanIndex = getattr(pd_errors, "InvalidUseOfBooleanIndex", _FallbackError)
LossySetitemError = getattr(pd_errors, "LossySetitemError", _FallbackError)
ValueLabelTypeMismatch = getattr(pd_errors, "ValueLabelTypeMismatch", _FallbackError)

WARMUP = 5
ITERATIONS = 200


def _run():
    e1 = pd_errors.AbstractMethodError(object())
    e2 = pd_errors.AccessorRegistrationWarning("shadowed accessor")
    e3 = pd_errors.AttributeConflictWarning("conflicting attribute")
    e4 = pd_errors.CSSWarning("bad css rule")
    e5 = pd_errors.ChainedAssignmentError()
    e6 = pd_errors.DatabaseError("connection failed")
    e7 = pd_errors.DtypeWarning("mismatched dtypes")
    e8 = pd_errors.DuplicateLabelError("Index has duplicates")
    e9 = InvalidColumnName("bad column")
    e10 = pd_errors.InvalidComparison("incompatible types")
    e11 = InvalidUseOfBooleanIndex("bad boolean index")
    e12 = pd_errors.InvalidVersion("not.a.version")
    e13 = LossySetitemError("would lose precision")
    e14 = pd_errors.NullFrequencyError("null frequency")
    e15 = pd_errors.NumbaUtilError("numba failure")
    e16 = pd_errors.OutOfBoundsDatetime("out of bounds timestamp")
    e17 = pd_errors.OutOfBoundsTimedelta("out of bounds timedelta")
    e18 = pd_errors.ParserWarning("falling back to python engine")
    e19 = pd_errors.PossibleDataLossError("mode='w' will overwrite")
    e20 = pd_errors.PossiblePrecisionLoss("float64 -> float32")
    e21 = pd_errors.SpecificationError("nested renamer is not supported")
    e22 = pd_errors.UnsupportedFunctionCall("numpy operation not supported")
    e23 = ValueLabelTypeMismatch("mismatched value/label types")

    _a = isinstance(e1, Exception)
    _b = isinstance(e2, pd_errors.AccessorRegistrationWarning)
    _c = type(e3).__name__ == "AttributeConflictWarning"
    _d = type(e4).__name__ == "CSSWarning"
    _e = "copy" in str(e5) or True
    _f = isinstance(e6, pd_errors.DatabaseError)
    _g = type(e7).__name__ == "DtypeWarning"
    _h = isinstance(e8, ValueError)
    _i = type(e9).__name__ in ("InvalidColumnName", "_FallbackError")
    _j = isinstance(e10, TypeError)
    _k = isinstance(e11, (IndexError, ValueError))
    _l = isinstance(e12, ValueError)
    _m = type(e13).__name__ in ("LossySetitemError", "_FallbackError")
    _n = isinstance(e14, ValueError)
    _o = type(e15).__name__ == "NumbaUtilError"
    _p = isinstance(e16, ValueError)
    _q = isinstance(e17, ValueError)
    _r = type(e18).__name__ == "ParserWarning"
    _s = type(e19).__name__ == "PossibleDataLossError"
    _t = type(e20).__name__ == "PossiblePrecisionLoss"
    _u = isinstance(e21, ValueError)
    _v = isinstance(e22, ValueError)
    _w = type(e23).__name__ in ("ValueLabelTypeMismatch", "_FallbackError")
    return [
        _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w,
    ]


for _ in range(WARMUP):
    _run()

start = time.perf_counter()
for _ in range(ITERATIONS):
    _run()
total_ms = (time.perf_counter() - start) * 1000

print(
    json.dumps(
        {
            "function": "errors_extended",
            "mean_ms": total_ms / ITERATIONS,
            "iterations": ITERATIONS,
            "total_ms": total_ms,
        }
    )
)
