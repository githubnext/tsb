"""Benchmark: pivot_table with fill_value=0 — fills missing cells with 0."""
import json, time
import numpy as np
import pandas as pd

ROWS = 50_000
WARMUP = 3
ITERATIONS = 10

rows = [f"row_{i % 50}" for i in range(ROWS)]
cols = [f"col_{i % 30}" for i in range(ROWS)]
vals = np.arange(ROWS, dtype=np.float64) * 0.1
df = pd.DataFrame({"row": rows, "col": cols, "value": vals})

for _ in range(WARMUP):
    df.pivot_table(values="value", index="row", columns="col", aggfunc="sum", fill_value=0)

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.pivot_table(values="value", index="row", columns="col", aggfunc="sum", fill_value=0)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "pivot_table_fill_value",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
