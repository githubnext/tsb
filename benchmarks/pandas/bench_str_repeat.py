"""Benchmark: str_repeat — str.repeat on 100k strings"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = [f"ab_{i % 100}" for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.str.repeat(3)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.str.repeat(3)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "str_repeat",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
