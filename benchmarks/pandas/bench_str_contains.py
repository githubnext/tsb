"""Benchmark: pd.Series.str.contains() — regex and literal substring matching on 100k strings."""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 5
ITERATIONS = 30

data = [f"item_{i % 500}_value_{i % 7}_end" for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.str.contains("value", regex=False)
    s.str.contains(r"_[0-9]+_", regex=True)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.str.contains("value", regex=False)
    s.str.contains(r"_[0-9]+_", regex=True)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({
    "function": "str_contains",
    "mean_ms": round(total_ms / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
