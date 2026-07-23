"""Benchmark: lreshape — wide-to-long reshape using named column groups.
Dataset: 10,000 rows with 4 value columns (v1..v4), 50 iterations.
"""
import json
import time
import numpy as np
import pandas as pd

N = 10_000
WARMUP = 3
ITERATIONS = 50

ids = np.arange(N)
data = {
    "id": ids,
    "v1": ids * 1.0,
    "v2": ids * 2.0,
    "v3": ids * 3.0,
    "v4": ids * 4.0,
}
df = pd.DataFrame(data)
groups = {"value": ["v1", "v2", "v3", "v4"]}

for _ in range(WARMUP):
    pd.lreshape(df, groups)

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.lreshape(df, groups)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "lreshape",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
