"""Benchmark: bootstrap confidence interval on 1000-element array
Uses percentile method with 500 resamples for a realistic workload.
"""
import json
import time
import numpy as np

N = 1_000
WARMUP = 3
ITERATIONS = 10

rng = np.random.default_rng(42)
data = np.sin(np.arange(N) * 0.01) * 50 + 100


def bootstrap_ci(arr, stat_fn, n_resamples=500, seed=42):
    """Percentile bootstrap CI."""
    rng_local = np.random.default_rng(seed)
    stats = np.empty(n_resamples)
    for i in range(n_resamples):
        resample = rng_local.choice(arr, size=len(arr), replace=True)
        stats[i] = stat_fn(resample)
    return np.percentile(stats, [2.5, 97.5])


def mean_fn(xs):
    return np.mean(xs)


for _ in range(WARMUP):
    bootstrap_ci(data, mean_fn, n_resamples=500)

start = time.perf_counter()
for _ in range(ITERATIONS):
    bootstrap_ci(data, mean_fn, n_resamples=500)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "bootstrap",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
