"""
Benchmark: Series numeric pipeline — chain abs → round → clip on a 100k-element Series.
Mirrors bench_series_numeric_pipeline.ts.
Outputs JSON: {"function": "series_numeric_pipeline", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import math
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 30

s = pd.Series([math.sin(i * 0.01) * 150 - 20 for i in range(SIZE)])

for _ in range(WARMUP):
    a = s.abs()
    b = a.round(2)
    b.clip(lower=0, upper=100)

start = time.perf_counter()
for _ in range(ITERATIONS):
    a = s.abs()
    b = a.round(2)
    b.clip(lower=0, upper=100)
total = (time.perf_counter() - start) * 1000

print(
    json.dumps(
        {
            "function": "series_numeric_pipeline",
            "mean_ms": total / ITERATIONS,
            "iterations": ITERATIONS,
            "total_ms": total,
        }
    )
)
