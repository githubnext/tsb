"""
Benchmark: kstest + jarqueBera — Kolmogorov-Smirnov test and Jarque-Bera normality test.
Mirrors tsb bench_kstest_jarquebera.ts.
Dataset: 1,000 samples; 200 measured iterations.
Outputs JSON: {"function": "kstest_jarquebera", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
from scipy.stats import kstest, jarque_bera

WARMUP = 10
ITERATIONS = 200
N = 1_000

rng = np.random.default_rng(42)
# Match tsb: uniform in [-3, 3]
data = rng.uniform(-3, 3, N).tolist()

for _ in range(WARMUP):
    kstest(data, "norm")
    jarque_bera(data)

t0 = time.perf_counter()
for _ in range(ITERATIONS):
    kstest(data, "norm")
    jarque_bera(data)
total_ms = (time.perf_counter() - t0) * 1000
mean_ms = total_ms / ITERATIONS

print(json.dumps({"function": "kstest_jarquebera", "mean_ms": mean_ms, "iterations": ITERATIONS, "total_ms": total_ms}))
