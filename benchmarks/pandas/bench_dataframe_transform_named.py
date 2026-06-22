"""
Benchmark: pandas DataFrame.transform() with named aggregation strings.

Mirrors tsb dataFrameTransform with string names like "mean", "cumsum",
and ["sum", "mean"] applied column-wise.

Uses 10k-row DataFrame to match the TypeScript benchmark.
"""
import json
import time
import pandas as pd

ROWS = 10_000
WARMUP = 3
ITERATIONS = 20

a = [(i % 100) * 1.5 + 1 for i in range(ROWS)]
b = [((i * 3) % 200) * 0.5 + 2 for i in range(ROWS)]
c = [((i * 7) % 50) * 2.0 + 0.5 for i in range(ROWS)]
df = pd.DataFrame({"a": a, "b": b, "c": c})

# Warm-up
for _ in range(WARMUP):
    df.transform("mean")
    df.transform("cumsum")
    df.transform(["sum", "mean"])

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.transform("mean")
    df.transform("cumsum")
    df.transform(["sum", "mean"])
total_ms = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dataframe_transform_named",
    "mean_ms": total_ms / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
