"""Benchmark: linregress and polyfit — simple linear regression and polynomial fit.
Dataset: 10,000 points, 20 iterations.
"""
import json
import time
import numpy as np

N = 10_000
WARMUP = 3
ITERATIONS = 20

x = np.arange(N, dtype=float) / N
y = 2.5 * x + 1.0 + np.sin(np.arange(N) * 0.01) * 0.1


def linregress_numpy(xs, ys):
    """Simple OLS linear regression matching scipy.stats.linregress."""
    n = len(xs)
    sx = xs.sum()
    sy = ys.sum()
    sxx = (xs * xs).sum()
    sxy = (xs * ys).sum()
    slope = (n * sxy - sx * sy) / (n * sxx - sx * sx)
    intercept = (sy - slope * sx) / n
    return slope, intercept


for _ in range(WARMUP):
    linregress_numpy(x, y)
    np.polyfit(x, y, 2)

start = time.perf_counter()
for _ in range(ITERATIONS):
    linregress_numpy(x, y)
    np.polyfit(x, y, 2)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "linregress_polyfit",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
