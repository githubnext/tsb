"""
Benchmark: pandas DataFrame.diff() / DataFrame.shift() — standalone diff and shift.
Mirrors tsb bench_dataframe_diff_shift_fn.ts (standalone diffDataFrame/shiftDataFrame).
Outputs JSON: {"function": "dataframe_diff_shift_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 30

df = pd.DataFrame({
    "a": np.arange(SIZE, dtype=float),
    "b": np.arange(SIZE, dtype=float) * 0.5 + 100,
    "c": np.sin(np.arange(SIZE) * 0.01) * 1000,
})

for _ in range(WARMUP):
    df.diff(periods=1)
    df.shift(periods=3)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.diff(periods=1)
    df.shift(periods=3)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({
    "function": "dataframe_diff_shift_fn",
    "mean_ms": round(total_ms / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
