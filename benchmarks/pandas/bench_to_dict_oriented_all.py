"""Benchmark: DataFrame.to_dict with records, list, split orientations on 10k-row DataFrame"""
import json, time
import pandas as pd

ROWS = 10_000
WARMUP = 3
ITERATIONS = 10
df = pd.DataFrame({"a": range(ROWS), "b": [i * 1.5 for i in range(ROWS)], "c": [f"s{i}" for i in range(ROWS)]})

for _ in range(WARMUP):
    df.to_dict(orient="records")
    df.to_dict(orient="list")
    df.to_dict(orient="split")

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.to_dict(orient="records")
    df.to_dict(orient="list")
    df.to_dict(orient="split")
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "to_dict_oriented_all", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
