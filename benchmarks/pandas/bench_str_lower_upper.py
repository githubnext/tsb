"""Benchmark: str_lower_upper — str.lower and str.upper on 100k strings"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = [f"Hello_World_{i % 200}" for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.str.lower()
    s.str.upper()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.str.lower()
    s.str.upper()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "str_lower_upper",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
