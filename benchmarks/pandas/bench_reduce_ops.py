"""Benchmark: reduce_ops — nunique / any / all on Series and DataFrame of 100k rows."""
import json, time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

s = pd.Series(np.arange(SIZE) % 1000)
bool_s = pd.Series(np.arange(SIZE) > 0)
df = pd.DataFrame({
    "a": np.arange(SIZE) % 500,
    "b": np.arange(SIZE) % 200,
    "c": np.arange(SIZE) % 100,
})

for _ in range(WARMUP):
    s.nunique()
    bool_s.any()
    bool_s.all()
    df.nunique()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.nunique()
    bool_s.any()
    bool_s.all()
    df.nunique()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "reduce_ops",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
