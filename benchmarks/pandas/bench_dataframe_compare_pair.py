"""
Benchmark: DataFrame-to-DataFrame element-wise comparisons.

The existing dataframe_compare benchmark tests scalar comparisons only.
This tests df1.eq(df2), df1.ne(df2), df1.gt(df2), df1.le(df2) (DataFrame vs DataFrame).
Mirrors tsb dataFrameEq(df1, df2), dataFrameNe, dataFrameGt, dataFrameLe.

Outputs JSON: {"function": "dataframe_compare_pair", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 50_000
WARMUP = 5
ITERATIONS = 50

df1 = pd.DataFrame({
    "a": np.array([(i * 1.7) % 1000 for i in range(SIZE)]),
    "b": np.array([(i * 2.3) % 1000 for i in range(SIZE)]),
    "c": np.array([i % 100 for i in range(SIZE)]),
})

df2 = pd.DataFrame({
    "a": np.array([(i * 2.1) % 1000 for i in range(SIZE)]),
    "b": np.array([(i * 1.9) % 1000 for i in range(SIZE)]),
    "c": np.array([(i + 7) % 100 for i in range(SIZE)]),
})

for _ in range(WARMUP):
    df1.eq(df2)
    df1.ne(df2)
    df1.gt(df2)
    df1.le(df2)

start = time.perf_counter()
for _ in range(ITERATIONS):
    df1.eq(df2)
    df1.ne(df2)
    df1.gt(df2)
    df1.le(df2)
total_ms = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dataframe_compare_pair",
    "mean_ms": total_ms / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
