"""Benchmark: to_json_denormalize — json orient variants on 10k-row DataFrame."""
import json, time
import numpy as np
import pandas as pd

ROWS = 10_000
WARMUP = 5
ITERATIONS = 30

# DataFrame matching the tsb benchmark (nested-structure-like columns)
df = pd.DataFrame({
    "name": [f"user_{i}" for i in range(ROWS)],
    "address.city": [f"city_{i % 100}" for i in range(ROWS)],
    "address.zip": [str(10000 + (i % 9000)) for i in range(ROWS)],
    "score": np.arange(ROWS) * 0.01,
})

for _ in range(WARMUP):
    # pandas equivalent of toJsonDenormalize: to_dict("records") then reconstruct nesting
    recs = df.to_dict("records")
    # pandas equivalent of toJsonRecords: orient="records"
    df.to_json(orient="records")
    # pandas equivalent of toJsonSplit: orient="split"
    df.to_json(orient="split")
    # pandas equivalent of toJsonIndex: orient="index"
    df.to_json(orient="index")

start = time.perf_counter()
for _ in range(ITERATIONS):
    recs = df.to_dict("records")
    df.to_json(orient="records")
    df.to_json(orient="split")
    df.to_json(orient="index")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "to_json_denormalize",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
