"""Benchmark: read_parquet / to_parquet — Parquet round-trip on 10k rows."""
import json, time, io
import pandas as pd
import numpy as np

ROWS = 10_000
WARMUP = 3
ITERATIONS = 20

rng = np.random.default_rng(42)
df = pd.DataFrame({
    "id": np.arange(ROWS, dtype=np.int64),
    "value": np.arange(ROWS, dtype=np.float64) * 1.1,
    "flag": np.array([(i % 2 == 0) for i in range(ROWS)], dtype=bool),
    "label": [f"item_{i % 100}" for i in range(ROWS)],
})

for _ in range(WARMUP):
    buf = io.BytesIO()
    df.to_parquet(buf, engine="pyarrow")
    buf.seek(0)
    pd.read_parquet(buf, engine="pyarrow")

start = time.perf_counter()
for _ in range(ITERATIONS):
    buf = io.BytesIO()
    df.to_parquet(buf, engine="pyarrow")
    buf.seek(0)
    pd.read_parquet(buf, engine="pyarrow")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "parquet",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
