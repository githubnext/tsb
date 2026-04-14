"""Benchmark: str_find — str.find and str.rfind on 100k strings"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = [f"hello_world_{i % 200}_end" for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.str.find("world")
    s.str.rfind("_")

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.str.find("world")
    s.str.rfind("_")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "str_find",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
