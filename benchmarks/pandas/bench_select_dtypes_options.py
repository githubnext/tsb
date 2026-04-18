"""Benchmark: DataFrame.select_dtypes() — filter columns by dtype (include/exclude)."""
import json, time
import pandas as pd
import numpy as np

ROWS = 50_000
WARMUP = 5
ITERATIONS = 30

rng = np.random.default_rng(42)
df = pd.DataFrame({
    "intCol": np.arange(ROWS, dtype=np.int32),
    "floatCol": np.arange(ROWS, dtype=np.float64) * 1.5,
    "boolCol": np.arange(ROWS) % 2 == 0,
    "strCol": [f"s_{i % 100}" for i in range(ROWS)],
})

for _ in range(WARMUP):
    df.select_dtypes(include="number")
    df.select_dtypes(exclude="number")
    df.select_dtypes(include=["int", "float"])

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.select_dtypes(include="number")
    df.select_dtypes(exclude="number")
    df.select_dtypes(include=["int", "float"])
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function": "select_dtypes_options", "mean_ms": round(total_ms / ITERATIONS, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
