"""Benchmark: DataFrame.groupby().sum() with 1000 groups on a 100k-row DataFrame."""
import json
import time
import pandas as pd

ROWS = 100_000
N_GROUPS = 1_000
WARMUP = 3
ITERATIONS = 10

df = pd.DataFrame({
    "key": [f"g{i % N_GROUPS}" for i in range(ROWS)],
    "val1": [i * 0.5 for i in range(ROWS)],
    "val2": [i % 200 for i in range(ROWS)],
})

for _ in range(WARMUP):
    df.groupby("key").sum()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.groupby("key").sum()
    times.append((time.perf_counter() - t0) * 1000)

total = sum(times)
print(json.dumps({
    "function": "groupby_sum_many_groups",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
