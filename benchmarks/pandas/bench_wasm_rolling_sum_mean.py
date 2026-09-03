"""
Benchmark: rolling and expanding sum/mean — mirrors WASM-accelerated tsb functions.

Uses pandas Series.rolling(50).sum(), Series.rolling(50).mean(),
Series.expanding().sum(), Series.expanding().mean() on a 100k-element float64 array.

Outputs JSON: {"function": "wasm_rolling_sum_mean", "mean_ms": ..., "iterations": ..., "total_ms": ...}
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

data = np.array([math.sin(i * 0.001) * 100 + i * 0.01 for i in range(SIZE)], dtype=np.float64)
s = pd.Series(data)

rolling = s.rolling(window=WINDOW, min_periods=MIN_PERIODS)
expanding = s.expanding(min_periods=MIN_PERIODS)


def run() -> None:
    rolling.sum()
    rolling.mean()
    expanding.sum()
    expanding.mean()


for _ in range(WARMUP):
    run()

start = time.perf_counter()
for _ in range(ITERATIONS):
    run()
total = (time.perf_counter() - start) * 1000  # ms

print(
    json.dumps(
        {
            "function": "wasm_rolling_sum_mean",
            "mean_ms": total / ITERATIONS,
            "iterations": ITERATIONS,
            "total_ms": total,
        }
    )
)
