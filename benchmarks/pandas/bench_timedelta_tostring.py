"""
Benchmark: Timedelta.__str__() — formatting durations as strings.
Mirrors tsb Timedelta.toString() / formatTimedelta().
Outputs JSON: {"function": "timedelta_tostring", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

WARMUP = 5
ITERATIONS = 100
SIZE = 1_000

deltas = [pd.Timedelta(milliseconds=(i - SIZE // 2) * 7_778) for i in range(SIZE)]

for _ in range(WARMUP):
    for td in deltas[:50]:
        str(td)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    for td in deltas:
        str(td)
    times.append((time.perf_counter() - t0) * 1000)

total = sum(times)
print(json.dumps({
    "function": "timedelta_tostring",
    "mean_ms": round(total / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total, 3),
}))
