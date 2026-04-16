"""
Benchmark: Series.skew() / Series.kurt() — skewness and kurtosis on a 100k-element Series.
Outputs JSON: {"function": "skew_kurt", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import math
import time
import pandas as pd
import numpy as np

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

data = np.array([math.sin(i * 0.01) * 100 for i in range(SIZE)])
s = pd.Series(data)

for _ in range(WARMUP):
    s.skew()
    s.kurt()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.skew()
    s.kurt()
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "skew_kurt", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
