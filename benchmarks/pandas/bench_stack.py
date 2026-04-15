"""Benchmark: stack — df.stack() converts a wide DataFrame to long Series on a 1000x10 DataFrame"""
import json, time
import numpy as np
import pandas as pd

ROWS = 1_000
COLS = 10
WARMUP = 5
ITERATIONS = 50

data = {f"col{c}": np.arange(ROWS) * COLS + c for c in range(COLS)}
df = pd.DataFrame(data)

for _ in range(WARMUP):
    df.stack()

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.stack()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "stack",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
