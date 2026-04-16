"""
Benchmark: Series.idxmin() / Series.idxmax() — index of min/max on a 100k-element Series.
Outputs JSON: {"function": "idxmin_idxmax", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import math
import time
import pandas as pd
import numpy as np

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

data = np.array([math.sin(i * 0.01) * 1000 for i in range(SIZE)])
s = pd.Series(data)

for _ in range(WARMUP):
    s.idxmin()
    s.idxmax()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.idxmin()
    s.idxmax()
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "idxmin_idxmax", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
