"""
Benchmark: scipy percentileofscore, min-max normalization, coefficient of variation on 100k elements.
Outputs JSON: {"function": "numeric_stats_ext", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import math
import pandas as pd
import numpy as np

SIZE = 100_000
WARMUP = 5
ITERATIONS = 20

data = [math.sin(i * 0.001) * 100 + 50 for i in range(SIZE)]
s = pd.Series(data)

def percentile_of_score(arr, score):
    """Compute percentile rank of score (rank method)."""
    n = len(arr)
    below = sum(1 for v in arr if v < score)
    equal = sum(1 for v in arr if v == score)
    return (below + 0.5 * equal) / n * 100

def min_max_normalize(series):
    mn, mx = series.min(), series.max()
    return (series - mn) / (mx - mn)

def coeff_of_variation(series):
    return series.std(ddof=1) / series.mean()

for _ in range(WARMUP):
    percentile_of_score(data, 50)
    min_max_normalize(s)
    coeff_of_variation(s)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    percentile_of_score(data, 50)
    min_max_normalize(s)
    coeff_of_variation(s)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({
    "function": "numeric_stats_ext",
    "mean_ms": total_ms / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
