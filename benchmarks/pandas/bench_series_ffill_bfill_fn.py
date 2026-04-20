"""
Benchmark: pandas Series.ffill() / Series.bfill() — forward/backward fill for Series.
Mirrors tsb bench_series_ffill_bfill_fn.ts (standalone ffillSeries/bfillSeries).
Outputs JSON: {"function": "series_ffill_bfill_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

data = [float("nan") if i % 5 == 0 else i * 1.0 for i in range(SIZE)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.ffill()
    s.bfill()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.ffill()
    s.bfill()
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({
    "function": "series_ffill_bfill_fn",
    "mean_ms": round(total_ms / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
