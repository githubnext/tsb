"""Benchmark: DataFrame.items() / iteritems() — iterate over (columnName, Series) pairs."""
import json
import time
import pandas as pd

ROWS = 50_000
WARMUP = 5
ITERATIONS = 50

df = pd.DataFrame({
    "a": [float(i) for i in range(ROWS)],
    "b": [i % 500 for i in range(ROWS)],
    "c": [f"cat_{i % 50}" for i in range(ROWS)],
    "d": [i * 0.25 for i in range(ROWS)],
    "e": [None if i % 2 == 0 else i * 1.5 for i in range(ROWS)],
    "f": [i * 3 for i in range(ROWS)],
})

for _ in range(WARMUP):
    n = 0
    for _name, _col in df.items():
        n += 1
    for _name, _col in df.iteritems() if hasattr(df, "iteritems") else df.items():
        n += 1

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    n = 0
    for _name, _col in df.items():
        n += 1
    for _name, _col in df.iteritems() if hasattr(df, "iteritems") else df.items():
        n += 1
    times.append((time.perf_counter() - t0) * 1000)

total = sum(times)
print(json.dumps({
    "function": "dataframe_items",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
