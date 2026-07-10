"""Benchmark: pd.concat() with 20 DataFrames — many-frame concatenation on 100k total rows."""
import json
import time
import pandas as pd

N_FRAMES = 20
ROWS_EACH = 5_000
WARMUP = 5
ITERATIONS = 20

frames = [
    pd.DataFrame({
        "a": [float(f * ROWS_EACH + i) for i in range(ROWS_EACH)],
        "b": [(f * ROWS_EACH + i) % 100 for i in range(ROWS_EACH)],
        "c": [f"cat_{i % 20}" for i in range(ROWS_EACH)],
    })
    for f in range(N_FRAMES)
]

for _ in range(WARMUP):
    pd.concat(frames)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    pd.concat(frames)
    times.append((time.perf_counter() - t0) * 1000)

total = sum(times)
print(json.dumps({
    "function": "concat_many_frames",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
