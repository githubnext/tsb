"""Benchmark: Series.reindex / DataFrame.reindex with fill methods (ffill, bfill, nearest)."""
import json, time
import numpy as np
import pandas as pd

SIZE = 20_000
WARMUP = 3
ITERATIONS = 20

orig_labels = list(range(0, SIZE * 2, 2))  # even numbers
data = [i * 1.5 for i in range(SIZE)]
s = pd.Series(data, index=orig_labels)

new_index = list(range(SIZE * 2))  # all numbers 0..SIZE*2-1

df = pd.DataFrame({"a": data, "b": [v * 2 for v in data]}, index=orig_labels)

for _ in range(WARMUP):
    s.reindex(new_index, method="ffill")
    s.reindex(new_index, method="bfill")
    s.reindex(new_index, method="nearest")
    df.reindex(new_index, method="ffill")

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.reindex(new_index, method="ffill")
    s.reindex(new_index, method="bfill")
    s.reindex(new_index, method="nearest")
    df.reindex(new_index, method="ffill")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "reindex_fill_methods",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
