"""Benchmark: readStata / toStata round-trip on a 10k-row DataFrame"""
import json, time, tempfile, os
import numpy as np
import pandas as pd

ROWS = 10_000
WARMUP = 3
ITERATIONS = 20

ids = np.arange(ROWS, dtype=np.int32)
values = np.sin(np.arange(ROWS) * 0.01) * 1000
categories = np.array([f"cat_{i % 5}" for i in range(ROWS)])

df = pd.DataFrame({"id": ids, "value": values, "category": categories})

# Write to a temp Stata file so read_stata benchmarks read from disk
tmp = tempfile.NamedTemporaryFile(suffix=".dta", delete=False)
tmp.close()
df.to_stata(tmp.name, write_index=False)

# Warm up
for _ in range(WARMUP):
    pd.read_stata(tmp.name)

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.read_stata(tmp.name)
total = (time.perf_counter() - start) * 1000

os.unlink(tmp.name)

print(json.dumps({
    "function": "readStata",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
