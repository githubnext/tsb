"""
Benchmark: cumsum / cumprod with skipna=False on 100k-element Series.
Outputs JSON: {"function": "cumops_skipna", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 20

data = [(i % 100) * 0.001 + 1 if i % 20 != 0 else float("nan") for i in range(SIZE)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.cumsum(skipna=False)
    s.cumprod(skipna=False)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.cumsum(skipna=False)
    s.cumprod(skipna=False)
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "cumops_skipna", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
