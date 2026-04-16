"""Benchmark: pd.to_numeric — coerce string arrays to numeric."""
import json, time
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

str_nums = [str(i * 1.5) for i in range(SIZE)]
s = pd.Series(str_nums)

for _ in range(WARMUP):
    pd.to_numeric(str_nums, errors="coerce")
    pd.to_numeric(s, errors="coerce")

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    pd.to_numeric(str_nums, errors="coerce")
    pd.to_numeric(s, errors="coerce")
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function": "to_numeric", "mean_ms": round(total_ms / ITERATIONS, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
