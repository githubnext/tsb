"""
Benchmark: read_parquet / to_parquet — Parquet round-trip on 10k rows
"""
import json
import time
import io
import pandas as pd
import numpy as np

ROWS = 10_000
WARMUP = 3
ITERATIONS = 20

rng = np.random.default_rng(42)
df = pd.DataFrame({
    "id": np.arange(ROWS, dtype=np.int64),
    "value": np.arange(ROWS, dtype=np.float64) * 1.1,
    "label": [f"cat_{i % 50}" for i in range(ROWS)],
})

# Warm up
for _ in range(WARMUP):
    buf = io.BytesIO()
    df.to_parquet(buf)
    buf.seek(0)
    pd.read_parquet(buf)

# Measure round-trip
start = time.perf_counter()
for _ in range(ITERATIONS):
    buf = io.BytesIO()
    df.to_parquet(buf)
    buf.seek(0)
    pd.read_parquet(buf)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "readParquet",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
