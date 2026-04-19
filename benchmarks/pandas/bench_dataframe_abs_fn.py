"""
Benchmark: dataFrameAbs standalone — absolute value on a 100k-row × 4-column DataFrame.
Mirrors bench_dataframe_abs_fn.ts (uses df.abs() which is the pandas equivalent).
Outputs JSON: {"function": "dataframe_abs_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 30

df = pd.DataFrame(
    {
        "a": [(i % 200) - 100 for i in range(SIZE)],
        "b": [np.sin(i * 0.01) * 100 for i in range(SIZE)],
        "c": [-i * 0.5 for i in range(SIZE)],
        "d": [(i % 50) - 25 for i in range(SIZE)],
    }
)

for _ in range(WARMUP):
    df.abs()

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.abs()
total = (time.perf_counter() - start) * 1000

print(
    json.dumps(
        {
            "function": "dataframe_abs_fn",
            "mean_ms": total / ITERATIONS,
            "iterations": ITERATIONS,
            "total_ms": total,
        }
    )
)
