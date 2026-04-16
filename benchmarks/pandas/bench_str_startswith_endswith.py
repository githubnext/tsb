"""Benchmark: str_startswith_endswith — str.startswith and str.endswith on 100k strings"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = [f"hello_world_{i % 200}_suffix" for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.str.startswith("hello")
    s.str.endswith("suffix")

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.str.startswith("hello")
    s.str.endswith("suffix")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "str_startswith_endswith",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
