"""
Benchmark: DataFrame numeric pipeline — chain abs → round → sign on a 100k-row × 3-column DataFrame.
Mirrors bench_dataframe_numeric_pipeline.ts.
Outputs JSON: {"function": "dataframe_numeric_pipeline", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import math
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 20

df = pd.DataFrame(
    {
        "a": [math.sin(i * 0.01) * 150 - 20 for i in range(SIZE)],
        "b": [math.cos(i * 0.02) * 80 for i in range(SIZE)],
        "c": [(i % 1000) * 0.123 - 50 for i in range(SIZE)],
    }
)

for _ in range(WARMUP):
    a = df.abs()
    b = a.round(1)
    np.sign(b)

start = time.perf_counter()
for _ in range(ITERATIONS):
    a = df.abs()
    b = a.round(1)
    np.sign(b)
total = (time.perf_counter() - start) * 1000

print(
    json.dumps(
        {
            "function": "dataframe_numeric_pipeline",
            "mean_ms": total / ITERATIONS,
            "iterations": ITERATIONS,
            "total_ms": total,
        }
    )
)
