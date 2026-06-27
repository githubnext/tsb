"""
Benchmark: Series.autocorr(lag) — lag-N autocorrelation for a 100k-element numeric Series.

Mirrors tsb autoCorr.
Benchmarks lag=1, lag=5, and lag=20.
Outputs JSON: {"function": "autocorr", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import math
import time
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

data = [math.sin(i * 0.05) + (i % 7) * 0.01 for i in range(SIZE)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.autocorr(lag=1)
    s.autocorr(lag=5)
    s.autocorr(lag=20)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.autocorr(lag=1)
    s.autocorr(lag=5)
    s.autocorr(lag=20)
total_ms = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "autocorr",
    "mean_ms": total_ms / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
