"""Benchmark: toNumeric generic — pd.to_numeric() with array, Series, and scalar inputs."""
import json, time
import pandas as pd

SIZE = 50_000
WARMUP = 5
ITERATIONS = 30

str_nums = [str(i * 1.5) for i in range(SIZE)]
s = pd.Series(str_nums)

for _ in range(WARMUP):
    pd.to_numeric(str_nums, errors="coerce")
    pd.to_numeric(s, errors="coerce")
    pd.to_numeric("42.7")

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.to_numeric(str_nums, errors="coerce")
    pd.to_numeric(s, errors="coerce")
    pd.to_numeric("42.7")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "to_numeric_dispatch",
    "mean_ms": round(total / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total, 3),
}))
