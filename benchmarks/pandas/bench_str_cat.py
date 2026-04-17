"""Benchmark: str_cat — str.cat concatenating a Series with another array on 100k strings"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = [f"hello_{i % 200}" for i in range(ROWS)]
other = [f"_world_{i % 100}" for i in range(ROWS)]
s = pd.Series(data)
t = pd.Series(other)

for _ in range(WARMUP):
    s.str.cat(t, sep="-")

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.str.cat(t, sep="-")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "str_cat",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
