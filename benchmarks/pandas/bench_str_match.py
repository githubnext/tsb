"""Benchmark: str_match — str.match regex matching on 100k strings"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = [f"item_{i % 500}_abc" for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.str.match(r"^item_\d+")

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.str.match(r"^item_\d+")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "str_match",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
