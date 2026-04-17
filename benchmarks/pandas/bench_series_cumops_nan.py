"""
Benchmark: cumsum / cumprod / cummax / cummin on 100k Series with NaN values.
Outputs JSON: {"function": "series_cumops_nan", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import math
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 20

raw = [float("nan") if i % 10 == 0 else math.sin(i * 0.01) * 50 + 100 for i in range(SIZE)]
s = pd.Series(raw)

for _ in range(WARMUP):
    s.cumsum()
    s.cumprod()
    s.cummax()
    s.cummin()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.cumsum()
    s.cumprod()
    s.cummax()
    s.cummin()
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "series_cumops_nan", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
