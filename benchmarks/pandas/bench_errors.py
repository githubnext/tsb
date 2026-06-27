"""Benchmark: pd.errors namespace — instantiate and inspect pandas-compatible error classes.

Mirrors tsb's errors namespace: create error instances, check isinstance, .name and .message.
"""
import json
import time
import pandas.errors as pd_errors

WARMUP = 5
ITERATIONS = 200


def _run():
    e1 = ValueError("bad value")
    e2 = KeyError("missing key")
    e3 = pd_errors.MergeError("incompatible merge")
    e4 = pd_errors.EmptyDataError("no data")
    e5 = pd_errors.OptionError("unknown option")
    e6 = pd_errors.IntCastingNaNError()
    e7 = pd_errors.UnsortedIndexError("MultiIndex slicing requires the index to be lexsorted")
    e8 = pd_errors.ParserError("unexpected token")
    e9 = pd_errors.PerformanceWarning("slow path")
    e10 = pd_errors.InvalidIndexError("bad index")

    _a = isinstance(e1, ValueError)
    _b = isinstance(e2, KeyError)
    _c = isinstance(e3, Exception)
    _d = type(e4).__name__ == "EmptyDataError"
    _e = "unknown" in str(e5)
    _f = isinstance(e6, pd_errors.IntCastingNaNError)
    _g = isinstance(e7, pd_errors.UnsortedIndexError)
    _h = type(e8).__name__ == "ParserError"
    _i = type(e9).__name__ == "PerformanceWarning"
    _j = isinstance(e10, pd_errors.InvalidIndexError)
    return [_a, _b, _c, _d, _e, _f, _g, _h, _i, _j]


for _ in range(WARMUP):
    _run()

start = time.perf_counter()
for _ in range(ITERATIONS):
    _run()
total_ms = (time.perf_counter() - start) * 1000

print(
    json.dumps(
        {
            "function": "errors",
            "mean_ms": total_ms / ITERATIONS,
            "iterations": ITERATIONS,
            "total_ms": total_ms,
        }
    )
)
