"""Benchmark: DataFrame column access via [] and 'in' on a 100k-row DataFrame"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10
df = pd.DataFrame({"a": range(ROWS), "b": [i * 2.0 for i in range(ROWS)]})

for _ in range(WARMUP):
    df["a"]
    "b" in df.columns
    df.get("c")

start = time.perf_counter()
for _ in range(ITERATIONS):
    df["a"]
    "b" in df.columns
    df.get("c")
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "dataframe_col_has", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
