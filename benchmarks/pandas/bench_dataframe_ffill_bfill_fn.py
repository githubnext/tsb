"""
Benchmark: pandas DataFrame.ffill() / DataFrame.bfill() — forward/backward fill.
Mirrors tsb bench_dataframe_ffill_bfill_fn.ts (standalone dataFrameFfill/dataFrameBfill).
Outputs JSON: {"function": "dataframe_ffill_bfill_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 30

rng = np.random.default_rng(42)
a = np.where(np.arange(SIZE) % 5 == 0, np.nan, np.arange(SIZE, dtype=float))
b = np.where(np.arange(SIZE) % 7 == 0, np.nan, np.arange(SIZE, dtype=float) * 0.5)
c = np.where(np.arange(SIZE) % 3 == 0, np.nan, np.arange(SIZE, dtype=float) * 2.0)

df = pd.DataFrame({"a": a, "b": b, "c": c})

for _ in range(WARMUP):
    df.ffill()
    df.bfill()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.ffill()
    df.bfill()
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({
    "function": "dataframe_ffill_bfill_fn",
    "mean_ms": round(total_ms / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
