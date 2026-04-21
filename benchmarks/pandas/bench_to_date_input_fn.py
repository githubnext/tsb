"""Benchmark: toDateInput — normalize various date inputs using pandas Timestamp.
Mirrors tsb bench_to_date_input_fn.ts.
"""
import json, time
import pandas as pd

SIZE = 50_000
WARMUP = 5
ITERATIONS = 50

strings = [f"2020-{1 + (i % 12):02d}-01" for i in range(SIZE)]
timestamps = [int((pd.Timestamp("2020-01-01").timestamp() + i * 86400) * 1000) for i in range(SIZE)]
dates = [pd.Timestamp(2020, 1 + (i % 12), 1 + (i % 28)) for i in range(SIZE)]

for _ in range(WARMUP):
    for s in strings[:100]:
        pd.Timestamp(s)
    for t in timestamps[:100]:
        pd.Timestamp(t, unit="ms")
    for d in dates[:100]:
        pd.Timestamp(d)

start = time.perf_counter()
for _ in range(ITERATIONS):
    for s in strings:
        pd.Timestamp(s)
    for t in timestamps:
        pd.Timestamp(t, unit="ms")
    for d in dates:
        pd.Timestamp(d)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "to_date_input_fn",
    "mean_ms": round(total / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total, 3),
}))
