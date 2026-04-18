"""Benchmark: pd.to_numeric generic dispatcher — coerce scalars, lists, and Series.
Mirrors tsb bench_to_numeric_generic.ts for pandas.
"""
import json, time
import pandas as pd

SIZE = 10_000
WARMUP = 5
ITERATIONS = 50

str_nums = [str(i * 0.1) for i in range(SIZE)]
series = pd.Series(str_nums)

for _ in range(WARMUP):
    pd.to_numeric("3.14")
    pd.to_numeric(str_nums[:100], errors="coerce")
    pd.to_numeric(series, errors="coerce")

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    pd.to_numeric("3.14")
    pd.to_numeric(str_nums, errors="coerce")
    pd.to_numeric(series, errors="coerce")
    times.append((time.perf_counter() - t0) * 1000)

total = sum(times)
mean = total / ITERATIONS
print(json.dumps({
    "function": "to_numeric_generic",
    "mean_ms": round(mean, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total, 3),
}))
