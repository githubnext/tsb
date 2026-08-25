"""
Benchmark: WASM rolling/expanding stats equivalents using pandas/numpy —
Series.rolling(50).min/max/var/std/median and Series.expanding().min/max/var/std/median
on a 100k-element float64 array.

Mirrors bench_wasm_rolling_stats.ts

Outputs JSON: {"function": "wasm_rolling_stats", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""

import json
import math
import time

import numpy as np
import pandas as pd

SIZE = 100_000
WINDOW = 50
MIN_PERIODS = 1
WARMUP = 3
ITERATIONS = 20

# Deterministic float64 data (same as TS counterpart)
data = np.array(
    [math.sin(i * 0.001) * 100 + math.cos(i * 0.003) * 50 for i in range(SIZE)],
    dtype=np.float64,
)
s = pd.Series(data)


def run_once() -> None:
    s.rolling(WINDOW, min_periods=MIN_PERIODS).min()
    s.rolling(WINDOW, min_periods=MIN_PERIODS).max()
    s.rolling(WINDOW, min_periods=MIN_PERIODS).var()
    s.rolling(WINDOW, min_periods=MIN_PERIODS).std()
    s.rolling(WINDOW, min_periods=MIN_PERIODS).median()
    s.expanding(min_periods=MIN_PERIODS).min()
    s.expanding(min_periods=MIN_PERIODS).max()
    s.expanding(min_periods=MIN_PERIODS).var()
    s.expanding(min_periods=MIN_PERIODS).std()
    s.expanding(min_periods=MIN_PERIODS).median()


# Warm-up
for _ in range(WARMUP):
    run_once()

# Measured iterations
t0 = time.perf_counter()
for _ in range(ITERATIONS):
    run_once()
total_ms = (time.perf_counter() - t0) * 1000

print(
    json.dumps(
        {
            "function": "wasm_rolling_stats",
            "mean_ms": total_ms / ITERATIONS,
            "iterations": ITERATIONS,
            "total_ms": total_ms,
        }
    )
)
