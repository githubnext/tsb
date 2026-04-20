"""
Benchmark: np.histogram with custom bin edges on 100k-element array.
Outputs JSON: {"function": "histogram_bin_edges", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

data = np.array([(i % 1000) * 0.1 for i in range(SIZE)])
bin_edges = np.array([i * 5.0 for i in range(21)])  # 20 bins covering [0, 100)

for _ in range(WARMUP):
    np.histogram(data, bins=bin_edges)
    np.histogram(data, bins=20)

start = time.perf_counter()
for _ in range(ITERATIONS):
    np.histogram(data, bins=bin_edges)
    np.histogram(data, bins=20)
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "histogram_bin_edges", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
