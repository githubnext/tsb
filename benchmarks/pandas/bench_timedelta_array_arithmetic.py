"""
Benchmark: pandas TimedeltaArray arithmetic — add, sub, mul on 100k-element
nullable timedelta arrays, plus extended component accessors (seconds component,
total_seconds, nanoseconds).

Mirrors tsb's bench_timedelta_array_arithmetic.
Outputs JSON: {"function": "timedelta_array_arithmetic", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

N = 100_000
WARMUP = 3
ITERATIONS = 20

# Build two arrays with ~10% NaT; values in nanoseconds (timedelta64 uses ns)
# raw1: ~1 minute per element
raw1_ns = np.array(
    [None if i % 10 == 0 else i * 60_000 * 1_000_000 for i in range(N)],
    dtype=object,
)
# raw2: ~1 second per element (descending)
raw2_ns = np.array(
    [None if i % 7 == 0 else (N - i) * 1_000 * 1_000_000 for i in range(N)],
    dtype=object,
)

td1 = pd.to_timedelta(raw1_ns, unit="ns")
td2 = pd.to_timedelta(raw2_ns, unit="ns")

arr1 = pd.array(td1, dtype="timedelta64[ns]")
arr2 = pd.array(td2, dtype="timedelta64[ns]")

scalar = pd.Timedelta(seconds=5)


def run():
    # Extended component accessors
    _ = arr1.seconds     # seconds component (within a minute)
    _ = arr1.microseconds  # microseconds component
    _ = arr1.total_seconds()  # total seconds

    # Arithmetic with another array
    _ = arr1 + arr2
    _ = arr1 - arr2

    # Arithmetic with a scalar
    _ = arr1 + scalar
    _ = arr1 - scalar
    _ = arr1 * 2.5


for _ in range(WARMUP):
    run()

start = time.perf_counter()
for _ in range(ITERATIONS):
    run()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "timedelta_array_arithmetic",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
