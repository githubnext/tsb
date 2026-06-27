"""Benchmark: DataFrame.from_records() — construct a DataFrame from a list of dicts."""
import json
import time
import pandas as pd

ROWS = 20_000
WARMUP = 5
ITERATIONS = 20

records = [
    {"id": i, "value": i * 1.5, "category": f"cat_{i % 50}", "score": None if i % 2 == 0 else i * 0.1, "rank": i % 100}
    for i in range(ROWS)
]

for _ in range(WARMUP):
    pd.DataFrame.from_records(records)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    pd.DataFrame.from_records(records)
    times.append((time.perf_counter() - t0) * 1000)

total = sum(times)
print(json.dumps({
    "function": "dataframe_from_records",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
