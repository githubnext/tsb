"""
Benchmark: resample_label_closed — pd.Series.resample with explicit label options.

Mirrors tsb: resampleSeries(s, "H", { label: "right" }).sum() and
             resampleSeries(s, "H", { label: "left" }).mean()

Uses a 50k-row minute-resolution dataset.

Outputs JSON: {"function": "resample_label_closed", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import math
import numpy as np
import pandas as pd

SIZE = 50_000
WARMUP = 3
ITERATIONS = 30

base = pd.Timestamp("2020-01-01T00:00:00Z")
idx = pd.date_range(base, periods=SIZE, freq="min")
data = np.array([(i % 200) * 0.5 + math.sin(i * 0.02) * 20 for i in range(SIZE)])
s = pd.Series(data, index=idx)

# Warm up
for _ in range(WARMUP):
    s.resample("H", label="right").sum()
    s.resample("H", label="left").mean()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.resample("H", label="right").sum()
    s.resample("H", label="left").mean()
    times.append((time.perf_counter() - t0) * 1000)

total = sum(times)
print(json.dumps({
    "function": "resample_label_closed",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
