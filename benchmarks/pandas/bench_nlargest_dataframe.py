"""Benchmark: DataFrame.nlargest / nsmallest — top-N rows by column."""
import json, time
import pandas as pd
import numpy as np

ROWS = 100_000
N = 100
WARMUP = 5
ITERATIONS = 30

rng = np.random.default_rng(42)
df = pd.DataFrame({
    "a": rng.random(ROWS) * 1000,
    "b": rng.random(ROWS) * 500,
    "c": rng.random(ROWS) * 100,
})

for _ in range(WARMUP):
    df.nlargest(N, "a")
    df.nsmallest(N, "b")

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.nlargest(N, "a")
    df.nsmallest(N, "b")
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function": "nlargest_dataframe", "mean_ms": round(total_ms / ITERATIONS, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
