"""Benchmark: Series.str.replace() with a regex pattern on 50k strings."""
import json
import time
import pandas as pd

ROWS = 50_000
WARMUP = 5
ITERATIONS = 30

data = [f"item_{i % 1000}_val{i % 50}" for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.str.replace(r"[0-9]+", "#", regex=True)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.str.replace(r"[0-9]+", "#", regex=True)
    times.append((time.perf_counter() - t0) * 1000)

total = sum(times)
print(json.dumps({
    "function": "series_str_replace_regex",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
