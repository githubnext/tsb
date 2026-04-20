"""Benchmark: interpolateSeries with linear, ffill, bfill, nearest, zero methods."""
import json, time
import pandas as pd
import numpy as np

SIZE = 50_000
WARMUP = 5
ITERATIONS = 30

data = [float(i) * 0.1 if i % 5 != 0 else None for i in range(SIZE)]
s = pd.Series(data, dtype=float)

for _ in range(WARMUP):
    s.interpolate(method="linear")
    s.ffill()
    s.bfill()
    s.interpolate(method="nearest")
    s.interpolate(method="zero")

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.interpolate(method="linear")
    s.ffill()
    s.bfill()
    s.interpolate(method="nearest")
    s.interpolate(method="zero")
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function": "interpolate_methods", "mean_ms": round(total_ms / ITERATIONS, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
