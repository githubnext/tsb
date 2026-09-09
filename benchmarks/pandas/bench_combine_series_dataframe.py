"""
Benchmark: DataFrame.combine / Series.combine — element-wise combine of two
Series (and column-by-column combine of two DataFrames) with a binary function.
"""
import json
import time

import pandas as pd
import numpy as np

N = 50_000
WARMUP = 2
ITERATIONS = 5

idx = np.arange(N)
a = pd.Series(np.arange(N, dtype=np.float64), index=idx)
b = pd.Series(np.arange(N, dtype=np.float64) * 2.0, index=idx)

df_a = pd.DataFrame({"x": a.values, "y": b.values})
df_b = pd.DataFrame({"x": b.values, "z": a.values})


def add(p, q):
    p = 0 if pd.isna(p) else p
    q = 0 if pd.isna(q) else q
    return p + q


for _ in range(WARMUP):
    a.combine(b, add, fill_value=0)
    df_a.combine(df_b, lambda s1, s2: s1.combine(s2, add, fill_value=0), fill_value=0)

start = time.perf_counter()
for _ in range(ITERATIONS):
    a.combine(b, add, fill_value=0)
    df_a.combine(df_b, lambda s1, s2: s1.combine(s2, add, fill_value=0), fill_value=0)
total = (time.perf_counter() - start) * 1000

print(
    json.dumps(
        {
            "function": "combine_series_dataframe",
            "mean_ms": total / ITERATIONS,
            "iterations": ITERATIONS,
            "total_ms": total,
        }
    )
)
