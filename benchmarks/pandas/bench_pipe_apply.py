"""Benchmark: pipe / apply / applymap on 10,000-row datasets.

Exercises three functional-pipeline operations:
  - pipe: chain 4 transforms on a Series
  - apply: element-wise function on 10k-element Series
  - applymap: element-wise function on 10k x 3 DataFrame
"""
import json
import time
import numpy as np
import pandas as pd

N = 10_000
WARMUP = 5
ITERATIONS = 20

raw = np.array([(i % 100) + 1 for i in range(N)], dtype=float)
series = pd.Series(raw, name="x")
df = pd.DataFrame({
    "a": [(i % 50) + 1 for i in range(N)],
    "b": [(i % 30) + 1 for i in range(N)],
    "c": [(i % 20) + 1 for i in range(N)],
}, dtype=float)


def run_pipe(s):
    return s.pipe(lambda x: x + 1).pipe(lambda x: x * 2).pipe(lambda x: x - 1).pipe(lambda x: x / 2)


def apply_fn(v):
    return v * 2 + 1


def applymap_fn(v):
    return v * 2


# Warm-up
for _ in range(WARMUP):
    run_pipe(series)
    series.apply(apply_fn)
    df.map(applymap_fn)

start = time.perf_counter()
for _ in range(ITERATIONS):
    run_pipe(series)
    series.apply(apply_fn)
    df.map(applymap_fn)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "pipe_apply",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
