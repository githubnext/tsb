"""
Benchmark: DataFrame.update() — in-place-style DataFrame value update.

Mirrors tsb dataFrameUpdate.
Overwrites non-null values from `other` into `self`.
Outputs JSON: {"function": "dataframe_update", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""

import json
import time

import numpy as np
import pandas as pd

N = 10_000
WARMUP = 20
ITERATIONS = 200

# Build two DataFrames; `other` has NaN in ~2/3 of rows (so 1/3 rows are updated).
a_data = [i * 1.0 for i in range(N)]
b_data = [i * 2.0 for i in range(N)]
a_other = [i * 10.0 if i % 3 == 0 else np.nan for i in range(N)]
b_other = [i * 20.0 if i % 3 == 0 else np.nan for i in range(N)]

df = pd.DataFrame({"a": a_data, "b": b_data})
other = pd.DataFrame({"a": a_other, "b": b_other})

# Warm-up
for _ in range(WARMUP):
    dc = df.copy()
    dc.update(other)

start = time.perf_counter()
for _ in range(ITERATIONS):
    dc = df.copy()
    dc.update(other)
total_ms = (time.perf_counter() - start) * 1000

print(
    json.dumps(
        {
            "function": "dataframe_update",
            "mean_ms": total_ms / ITERATIONS,
            "iterations": ITERATIONS,
            "total_ms": total_ms,
        }
    )
)
