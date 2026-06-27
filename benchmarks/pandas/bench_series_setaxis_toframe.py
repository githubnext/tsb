"""
Benchmark: Series.to_frame() / Series.set_axis() / DataFrame.set_axis() /
           Series.add_prefix() / Series.add_suffix()

Mirrors tsb bench_series_setaxis_toframe.
Dataset: 50 000-element numeric Series; 50 000-row × 3-column DataFrame.
Outputs JSON: {"function": "series_setaxis_toframe", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd
import numpy as np

SIZE = 50_000
WARMUP = 5
ITERATIONS = 50

data = [i * 1.5 for i in range(SIZE)]
idx = [f"r{i}" for i in range(SIZE)]
new_idx = [f"row_{i}" for i in range(SIZE)]

s = pd.Series(data, index=idx, name="values")
df = pd.DataFrame(
    {
        "a": list(range(SIZE)),
        "b": [i * 2 for i in range(SIZE)],
        "c": [i * 3 for i in range(SIZE)],
    },
    index=idx,
)
new_cols = ["col_a", "col_b", "col_c"]

for _ in range(WARMUP):
    s.to_frame()
    s.set_axis(new_idx)
    df.set_axis(new_idx, axis=0)
    df.set_axis(new_cols, axis=1)
    s.add_prefix("pre_")
    s.add_suffix("_suf")

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.to_frame()
    s.set_axis(new_idx)
    df.set_axis(new_idx, axis=0)
    df.set_axis(new_cols, axis=1)
    s.add_prefix("pre_")
    s.add_suffix("_suf")
total_ms = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_setaxis_toframe",
    "mean_ms": total_ms / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
