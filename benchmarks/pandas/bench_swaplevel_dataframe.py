"""
Benchmark: DataFrame.swaplevel / DataFrame.reorder_levels on 50k-row MultiIndex DataFrame.

Mirrors tsb bench_swaplevel_dataframe.ts.

Dataset: 50 000-row × 3-column DataFrame with a 3-level MultiIndex row index.

Outputs JSON: {"function": "swaplevel_dataframe", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time

import numpy as np
import pandas as pd

N = 50_000
WARMUP = 5
ITERATIONS = 30

lev_a = [f"a{i % 100}" for i in range(N)]
lev_b = [i % 500 for i in range(N)]
lev_c = [i % 10 for i in range(N)]

idx = pd.MultiIndex.from_arrays([lev_a, lev_b, lev_c], names=["L0", "L1", "L2"])
df = pd.DataFrame(
    {
        "x": np.arange(N, dtype=float),
        "y": np.arange(N, dtype=float) * 2.0,
        "z": np.arange(N, dtype=float) * 3.0,
    },
    index=idx,
)

for _ in range(WARMUP):
    df.swaplevel(0, 1, axis=0)
    df.swaplevel(0, 2, axis=0)
    df.reorder_levels([2, 0, 1], axis=0)
    df.reorder_levels([1, 2, 0], axis=0)

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.swaplevel(0, 1, axis=0)
    df.swaplevel(0, 2, axis=0)
    df.reorder_levels([2, 0, 1], axis=0)
    df.reorder_levels([1, 2, 0], axis=0)
total_ms = (time.perf_counter() - start) * 1000

print(
    json.dumps(
        {
            "function": "swaplevel_dataframe",
            "mean_ms": total_ms / ITERATIONS,
            "iterations": ITERATIONS,
            "total_ms": total_ms,
        }
    )
)
