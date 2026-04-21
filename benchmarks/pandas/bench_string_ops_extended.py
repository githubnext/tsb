"""Benchmark: string_ops_extended — strip, replace, startswith/endswith on 100k strings"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = [f"  hello_world_{i % 200}  " for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.str.strip()
    s.str.replace("hello", "hi", regex=False)
    s.str.startswith("hello")
    s.str.endswith("world")

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.str.strip()
    s.str.replace("hello", "hi", regex=False)
    s.str.startswith("hello")
    s.str.endswith("world")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "string_ops_extended",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
