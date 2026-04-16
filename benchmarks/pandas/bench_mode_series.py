"""
Benchmark: Series.mode() — mode of a 10k-element integer Series.
Outputs JSON: {"function": "mode_series", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

SIZE = 10_000
WARMUP = 5
ITERATIONS = 50

data = [i % 200 for i in range(SIZE)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.mode()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.mode()
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "mode_series", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
