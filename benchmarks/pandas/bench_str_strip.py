"""Benchmark: str_strip — str.strip, str.lstrip, str.rstrip on 100k strings"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = [f"  hello_world_{i % 200}  " for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.str.strip()
    s.str.lstrip()
    s.str.rstrip()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.str.strip()
    s.str.lstrip()
    s.str.rstrip()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "str_strip",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
