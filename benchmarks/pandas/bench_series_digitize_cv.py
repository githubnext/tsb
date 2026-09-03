"""Benchmark: Series.digitize (numpy.digitize) and coefficient of variation on 100k-element Series.

coefficientOfVariation mirrors scipy.stats.variation (std/mean).

Outputs JSON: {"function": "series_digitize_cv", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd
from scipy.stats import variation

N = 100_000
WARMUP = 3
ITERATIONS = 20

data = [((i * 2654435761) % 1_000_000) / 10_000 for i in range(N)]
s = pd.Series(data)
bins = [i * 5 for i in range(21)]

for _ in range(WARMUP):
    np.digitize(s.values, bins)
    variation(s.values, ddof=1)

start = time.perf_counter()
for _ in range(ITERATIONS):
    np.digitize(s.values, bins)
    variation(s.values, ddof=1)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_digitize_cv",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
