"""
Benchmark: chi2Contingency — chi-squared test of independence on contingency tables.
Mirrors tsb bench_chi2_contingency.ts.
Dataset: 500 iterations over 4×4, 5×3, and 3×5 contingency tables.
Outputs JSON: {"function": "chi2_contingency", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
from scipy.stats import chi2_contingency

WARMUP = 10
ITERATIONS = 500

table4x4 = np.array([
    [10, 20, 30, 15],
    [25, 35, 10, 20],
    [15, 10, 25, 30],
    [20, 15, 35, 10],
], dtype=float)
table5x3 = np.array([
    [50, 30, 20],
    [40, 45, 15],
    [35, 25, 40],
    [20, 50, 30],
    [55, 10, 35],
], dtype=float)
table3x5 = np.array([
    [10, 20, 15, 25, 30],
    [30, 15, 25, 10, 20],
    [20, 30, 10, 35, 5],
], dtype=float)

for _ in range(WARMUP):
    chi2_contingency(table4x4)
    chi2_contingency(table5x3)
    chi2_contingency(table3x5)

t0 = time.perf_counter()
for _ in range(ITERATIONS):
    chi2_contingency(table4x4)
    chi2_contingency(table5x3)
    chi2_contingency(table3x5)
total_ms = (time.perf_counter() - t0) * 1000
mean_ms = total_ms / ITERATIONS

print(json.dumps({"function": "chi2_contingency", "mean_ms": mean_ms, "iterations": ITERATIONS, "total_ms": total_ms}))
