"""Benchmark: str_fullmatch — str.fullmatch (regex full match) on 100k strings"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = [f"item_{i % 200}" for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.str.fullmatch(r"item_\d+")

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.str.fullmatch(r"item_\d+")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "str_fullmatch",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
