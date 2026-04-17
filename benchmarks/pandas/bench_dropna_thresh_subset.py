"""Benchmark: DataFrame.dropna with thresh and subset options."""
import json, time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 30

a = [None if i % 5 == 0 else float(i) for i in range(SIZE)]
b = [None if i % 7 == 0 else float(i * 2) for i in range(SIZE)]
c = [None if i % 11 == 0 else float(i * 3) for i in range(SIZE)]
d = [None if i % 3 == 0 else f"label_{i % 20}" for i in range(SIZE)]
df = pd.DataFrame({"a": a, "b": b, "c": c, "d": d})

for _ in range(WARMUP):
    df.dropna(how="any")
    df.dropna(how="all")
    df.dropna(thresh=3)
    df.dropna(subset=["a", "b"])

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.dropna(how="any")
    df.dropna(how="all")
    df.dropna(thresh=3)
    df.dropna(subset=["a", "b"])
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "dropna_thresh_subset",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
