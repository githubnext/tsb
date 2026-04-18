"""Benchmark: pd.crosstab() with normalize options — proportions by row/col/all."""
import json, time
import pandas as pd
import numpy as np

SIZE = 50_000
WARMUP = 5
ITERATIONS = 30

rng = np.random.default_rng(99)
choices_a = ["north", "south", "east", "west"]
choices_b = ["red", "green", "blue"]

a = pd.Series(np.array(choices_a)[rng.integers(0, 4, SIZE)])
b = pd.Series(np.array(choices_b)[rng.integers(0, 3, SIZE)])

for _ in range(WARMUP):
    pd.crosstab(a, b, normalize=True)
    pd.crosstab(a, b, normalize="index")
    pd.crosstab(a, b, normalize="columns")

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    pd.crosstab(a, b, normalize=True)
    pd.crosstab(a, b, normalize="index")
    pd.crosstab(a, b, normalize="columns")
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({
    "function": "crosstab_normalize",
    "mean_ms": round(total_ms / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
