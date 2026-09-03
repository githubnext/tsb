"""
Benchmark: numpy aggregate operations — np.sum, np.mean, np.min, np.max, np.var, np.std, np.median
plus pandas rolling and expanding window ops on a 100k-element float64 array.

Mirrors tsb bench_wasm_agg_ops.ts.

Outputs JSON: {"function": "wasm_agg_ops", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WINDOW = 50
MIN_PERIODS = 1
WARMUP = 3
ITERATIONS = 20

data = np.sin(np.arange(SIZE) * 0.001) * 1000
series = pd.Series(data)


def run():
    np.sum(data)
    np.mean(data)
    np.min(data)
    np.max(data)
    np.var(data, ddof=1)
    np.std(data, ddof=1)
    np.median(data)
    series.rolling(window=WINDOW, min_periods=MIN_PERIODS).sum()
    series.rolling(window=WINDOW, min_periods=MIN_PERIODS).mean()
    series.expanding(min_periods=MIN_PERIODS).sum()
    series.expanding(min_periods=MIN_PERIODS).mean()


for _ in range(WARMUP):
    run()

start = time.perf_counter()
for _ in range(ITERATIONS):
    run()
total = (time.perf_counter() - start) * 1000  # ms

print(json.dumps({
    "function": "wasm_agg_ops",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
