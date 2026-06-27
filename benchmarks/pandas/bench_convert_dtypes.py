"""
Benchmark: pandas Series.convert_dtypes() and DataFrame.convert_dtypes()

Creates a 50k-row dataset with object-dtype numeric, boolean, and string
columns, then measures how fast pandas can infer and convert to best dtypes.
"""
import json
import time
import numpy as np
import pandas as pd

N = 50_000
WARMUP = 3
ITERATIONS = 20

# Object-dtype arrays (same structure as the TypeScript version)
int_data = [None if i % 17 == 0 else i for i in range(N)]
float_data = [None if i % 13 == 0 else i * 1.5 for i in range(N)]
str_data = [None if i % 11 == 0 else f"str_{i}" for i in range(N)]
bool_data = [None if i % 7 == 0 else (i % 2 == 0) for i in range(N)]

int_series = pd.Series(int_data, dtype=object)
float_series = pd.Series(float_data, dtype=object)

df = pd.DataFrame({
    "int_col": int_data,
    "float_col": float_data,
    "str_col": str_data,
    "bool_col": bool_data,
})

# Warm-up
for _ in range(WARMUP):
    int_series.convert_dtypes()
    float_series.convert_dtypes()
    df.convert_dtypes()

start = time.perf_counter()
for _ in range(ITERATIONS):
    int_series.convert_dtypes()
    float_series.convert_dtypes()
    df.convert_dtypes()
total_ms = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "convert_dtypes",
    "mean_ms": total_ms / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
