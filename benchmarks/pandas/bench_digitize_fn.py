"""Benchmark: numpy.digitize (standalone) — bin 50k values into 10 bins.
Mirrors tsb bench_digitize_fn.ts for numpy/pandas.
"""
import json, time
import numpy as np

SIZE = 50_000
WARMUP = 5
ITERATIONS = 50

rng = np.random.default_rng(42)
values = np.where(
    np.arange(SIZE) % 20 == 0,
    np.nan,
    (np.arange(SIZE) % 100) * 0.1,
).tolist()
bins = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

for _ in range(WARMUP):
    np.digitize(values, bins)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    np.digitize(values, bins)
    times.append((time.perf_counter() - t0) * 1000)

total = sum(times)
mean = total / ITERATIONS
print(json.dumps({
    "function": "digitize_fn",
    "mean_ms": round(mean, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total, 3),
}))
