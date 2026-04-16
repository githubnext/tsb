"""Benchmark: factorize / pd.Categorical.from_codes — encode values as integer codes."""
import json, time
import pandas as pd
import numpy as np

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

categories = ["cat", "dog", "bird", "fish", "hamster"]
data = [categories[i % len(categories)] for i in range(SIZE)]
s = pd.Series(data)

for _ in range(WARMUP):
    pd.factorize(data)
    s.factorize()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    pd.factorize(data)
    s.factorize()
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function": "factorize", "mean_ms": round(total_ms / ITERATIONS, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
