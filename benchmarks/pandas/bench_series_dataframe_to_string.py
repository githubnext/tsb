"""Benchmark: Series + DataFrame string representations using pandas .to_string().
Mirrors tsb bench_series_dataframe_to_string.ts.
"""
import json, time
import pandas as pd
import numpy as np

ROWS = 1_000
WARMUP = 5
ITERATIONS = 100

ser = pd.Series(np.arange(ROWS) * 3.14159, name="values")
df = pd.DataFrame({
    "a": np.arange(ROWS) * 1.5,
    "b": [f"cat_{i % 20}" for i in range(ROWS)],
    "c": np.arange(ROWS) % 100,
})

for _ in range(WARMUP):
    ser.to_string()
    ser.head(10).to_string()
    df.to_string(max_rows=20)

start = time.perf_counter()
for _ in range(ITERATIONS):
    ser.to_string()
    ser.head(10).to_string()
    df.to_string()
    df.to_string(max_rows=20)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_dataframe_to_string",
    "mean_ms": round(total / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total, 3),
}))
