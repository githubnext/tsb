"""Benchmark: dataframe_fromrecords — pd.DataFrame(records) on 10k records with 5 columns"""
import json, time

ROWS = 10_000
WARMUP = 5
ITERATIONS = 50

records = [{"a": i, "b": i * 2.0, "c": i % 100, "d": i * 0.5, "e": i % 10} for i in range(ROWS)]

import pandas as pd

for _ in range(WARMUP):
    pd.DataFrame(records)

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.DataFrame(records)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dataframe_fromrecords",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
