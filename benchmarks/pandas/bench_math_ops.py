"""Benchmark: math_ops — abs / round on Series and DataFrame of 100k rows."""
import json, time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

s = pd.Series(np.where(np.arange(SIZE) % 2 == 0, -(np.arange(SIZE) + 0.567), np.arange(SIZE) + 0.567))
df = pd.DataFrame({
    "a": -(np.arange(SIZE) + 0.123),
    "b": np.arange(SIZE) + 0.456,
})

for _ in range(WARMUP):
    s.abs()
    df.abs()
    s.round(1)
    df.round(1)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.abs()
    df.abs()
    s.round(1)
    df.round(1)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "math_ops",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
