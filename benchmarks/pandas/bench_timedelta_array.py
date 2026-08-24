"""
Benchmark: pd.arrays.TimedeltaArray — create and operate on nullable timedelta arrays.
Outputs JSON: {"function": "timedelta_array", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

# Build values: ~10% NaT, small durations (i seconds) to avoid overflow
values = np.array(
    [None if i % 10 == 0 else i * 1_000_000_000 for i in range(SIZE)],  # nanoseconds (1 ns/unit)
    dtype=object,
)
td_values = pd.to_timedelta(values, unit="ns")
fill_value = pd.Timedelta(0)


def run():
    arr = pd.array(td_values, dtype="timedelta64[ns]")

    # Component access
    _ = arr.days
    _ = arr.seconds
    _ = arr.total_seconds()

    # Null checks
    _ = arr.isna()
    _ = ~arr.isna()

    # Aggregation (via numpy)
    valid = td_values[~pd.isna(td_values)]
    _ = valid.sum()
    _ = valid.min()
    _ = valid.max()

    # Fill
    _ = arr.fillna(fill_value)


for _ in range(WARMUP):
    run()

start = time.perf_counter()
for _ in range(ITERATIONS):
    run()
total_ms = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "timedelta_array",
    "mean_ms": total_ms / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
