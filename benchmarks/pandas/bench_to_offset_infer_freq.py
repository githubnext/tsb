"""
Benchmark: to_offset / infer_freq — pandas frequency string → DateOffset conversion
and inference of a regular date series frequency.

Matches benchmarks/tsb/bench_to_offset_infer_freq.ts.

Outputs JSON: {"function": "to_offset_infer_freq", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time

import pandas as pd

WARMUP = 20
ITERATIONS = 10_000

ALIASES = ["D", "B", "h", "min", "s", "ME", "MS", "QE", "QS", "YE", "YS", "W-MON", "2D", "3B", "-1ME"]

# Build a 365-element daily DatetimeIndex for infer_freq
daily_dates = pd.date_range("2020-01-01", periods=365, freq="D")

# Build a 12-element month-end DatetimeIndex
month_end_dates = pd.date_range("2023-01-31", periods=12, freq="ME")

# Warm-up
for _ in range(WARMUP):
    for alias in ALIASES:
        try:
            pd.tseries.frequencies.to_offset(alias)
        except Exception:
            pass
    pd.infer_freq(daily_dates)
    pd.infer_freq(month_end_dates)

# Measure
t0 = time.perf_counter()
for _ in range(ITERATIONS):
    for alias in ALIASES:
        try:
            pd.tseries.frequencies.to_offset(alias)
        except Exception:
            pass
    pd.infer_freq(daily_dates)
    pd.infer_freq(month_end_dates)
total_ms = (time.perf_counter() - t0) * 1000.0
mean_ms = total_ms / ITERATIONS

print(json.dumps({
    "function": "to_offset_infer_freq",
    "mean_ms": round(mean_ms, 6),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 4),
}))
