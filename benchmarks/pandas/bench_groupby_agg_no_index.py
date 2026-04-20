"""Benchmark: DataFrameGroupBy.agg() with as_index=False — group key as column."""
import json, time
import pandas as pd
import numpy as np

SIZE = 100_000
WARMUP = 3
ITERATIONS = 20

rng = np.random.default_rng(42)
groups = np.array(["alpha", "beta", "gamma", "delta", "epsilon"])
df = pd.DataFrame({
    "group": groups[rng.integers(0, 5, SIZE)],
    "x": rng.random(SIZE) * 100,
    "y": rng.random(SIZE) * 50,
})

for _ in range(WARMUP):
    df.groupby("group", as_index=False).agg({"x": "mean", "y": "sum"})

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.groupby("group", as_index=False).agg({"x": "mean", "y": "sum"})
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({
    "function": "groupby_agg_no_index",
    "mean_ms": round(total_ms / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
