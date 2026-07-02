"""Benchmark: DataFrame.iterrows() — iterate over (label, Series) pairs on a 3k-row DataFrame."""
import json
import time
import pandas as pd

ROWS = 3_000
WARMUP = 5
ITERATIONS = 30

df = pd.DataFrame({
    "a": [float(i) for i in range(ROWS)],
    "b": [i % 100 for i in range(ROWS)],
    "c": [f"cat_{i % 20}" for i in range(ROWS)],
    "d": [None if i % 2 == 0 else i * 0.5 for i in range(ROWS)],
    "e": [i * 2 for i in range(ROWS)],
})

for _ in range(WARMUP):
    n = 0
    for _label, _row in df.iterrows():
        n += 1

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    n = 0
    for _label, _row in df.iterrows():
        n += 1
    times.append((time.perf_counter() - t0) * 1000)

total = sum(times)
print(json.dumps({
    "function": "dataframe_iterrows",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
