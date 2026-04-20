"""Benchmark: Series.pct_change() / DataFrame.pct_change() with various periods."""
import json, time
import pandas as pd
import numpy as np

ROWS = 100_000
WARMUP = 5
ITERATIONS = 30

rng = np.random.default_rng(7)
data = rng.random(ROWS) * 100 + 10

series = pd.Series(data)
df = pd.DataFrame({
    "a": data,
    "b": data * 1.5,
    "c": data * 0.8,
})

for _ in range(WARMUP):
    series.pct_change(periods=1)
    series.pct_change(periods=7)
    df.pct_change(periods=5)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    series.pct_change(periods=1)
    series.pct_change(periods=7)
    df.pct_change(periods=5)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({
    "function": "pct_change_periods",
    "mean_ms": round(total_ms / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
