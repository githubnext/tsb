"""Benchmark: pd.read_json with all orient options (records, split, columns, index, values)."""
import json, time
import numpy as np
import pandas as pd

SIZE = 5_000
WARMUP = 3
ITERATIONS = 20

ids = list(range(SIZE))
values = [i * 1.1 for i in range(SIZE)]
labels = [f"cat_{i % 10}" for i in range(SIZE)]
df = pd.DataFrame({"id": ids, "value": values, "label": labels})

records_json = df.to_json(orient="records")
split_json = df.to_json(orient="split")
columns_json = df.to_json(orient="columns")
values_json = df.to_json(orient="values")
index_json = df.to_json(orient="index")

for _ in range(WARMUP):
    pd.read_json(records_json, orient="records")
    pd.read_json(split_json, orient="split")
    pd.read_json(columns_json, orient="columns")
    pd.read_json(values_json, orient="values")
    pd.read_json(index_json, orient="index")

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.read_json(records_json, orient="records")
    pd.read_json(split_json, orient="split")
    pd.read_json(columns_json, orient="columns")
    pd.read_json(values_json, orient="values")
    pd.read_json(index_json, orient="index")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "read_json_all_orients",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
