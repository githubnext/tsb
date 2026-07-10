"""Benchmark: pd.merge_ordered with fill_method='ffill' — two 5k-row DataFrames."""
import json
import time

import pandas as pd

N = 5_000
WARMUP = 2
ITERATIONS = 8

keys1 = list(range(0, N * 2, 2))
vals1 = [i * 1.0 for i in range(N)]
keys2 = list(range(0, N * 3, 3))
vals2 = [i * 2.0 for i in range(N)]

df1 = pd.DataFrame({"key": keys1, "val1": vals1})
df2 = pd.DataFrame({"key": keys2, "val2": vals2})

for _ in range(WARMUP):
    pd.merge_ordered(df1, df2, on="key", fill_method="ffill")

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.merge_ordered(df1, df2, on="key", fill_method="ffill")
total = (time.perf_counter() - start) * 1000

print(
    json.dumps(
        {
            "function": "merge_ordered_ffill",
            "mean_ms": total / ITERATIONS,
            "iterations": ITERATIONS,
            "total_ms": total,
        }
    )
)
