"""Benchmark: read_fwf — parse a fixed-width formatted text file into a DataFrame.
Dataset: 10,000 rows x 4 columns (id, name, value, flag).
"""
import json, time, io
import numpy as np
import pandas as pd

ROWS = 10_000
WARMUP = 3
ITERATIONS = 10

# Build fixed-width text matching the TypeScript benchmark
lines = ["id    name      value     flag"]
for i in range(ROWS):
    id_col = str(i).rjust(6)
    name_col = ("item" + str(i % 500)).ljust(10)
    value_col = f"{np.sin(i * 0.01) * 1000:.3f}".rjust(10)
    flag_col = ("Y" if i % 2 == 0 else "N").ljust(4)
    lines.append(id_col + name_col + value_col + flag_col)
text = "\n".join(lines)

colspecs = [(0, 6), (6, 16), (16, 26), (26, 30)]

for _ in range(WARMUP):
    pd.read_fwf(io.StringIO(text), colspecs=colspecs, header=0)

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.read_fwf(io.StringIO(text), colspecs=colspecs, header=0)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "readFwf",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
