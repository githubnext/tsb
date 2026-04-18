"""Benchmark: pivot standalone — pd.pivot() standalone function on a 100×20 grid DataFrame."""
import json, time
import pandas as pd
import numpy as np

ROWS = 100
COLS = 20
WARMUP = 5
ITERATIONS = 50

row_arr = []
col_arr = []
val_arr = []
for r in range(ROWS):
    for c in range(COLS):
        row_arr.append(r)
        col_arr.append(c)
        val_arr.append(r * COLS + c + 0.5)

df = pd.DataFrame({"row": row_arr, "col": col_arr, "val": val_arr})

for _ in range(WARMUP):
    pd.pivot(df, index="row", columns="col", values="val")

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.pivot(df, index="row", columns="col", values="val")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "pivot_fn",
    "mean_ms": round(total / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total, 3),
}))
