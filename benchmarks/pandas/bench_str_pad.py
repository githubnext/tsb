"""Benchmark: str_pad — str.pad, str.ljust, str.rjust on 100k strings"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = [f"hello_{i % 200}" for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.str.pad(20)
    s.str.ljust(20)
    s.str.rjust(20)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.str.pad(20)
    s.str.ljust(20)
    s.str.rjust(20)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "str_pad",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
