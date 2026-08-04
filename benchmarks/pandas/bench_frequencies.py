"""Benchmark: frequencies — to_offset and infer_freq.
Tests parsing frequency strings and inferring frequency from date arrays.
"""
import json
import time
import pandas as pd

WARMUP = 5
ITERATIONS = 50

FREQ_STRINGS = ["D", "h", "min", "s", "ME", "MS", "YE", "YS", "W", "3ME", "2h", "QE", "QS"]

# Build a regularly-spaced daily date index for infer_freq
daily_index = pd.date_range("2020-01-01", periods=365, freq="D")


def run():
    for freq in FREQ_STRINGS:
        pd.tseries.frequencies.to_offset(freq)
    pd.infer_freq(daily_index)


for _ in range(WARMUP):
    run()

start = time.perf_counter()
for _ in range(ITERATIONS):
    run()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "frequencies",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
