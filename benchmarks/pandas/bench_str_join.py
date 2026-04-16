"""Benchmark: str_join — str.join on 100k list-of-strings Series values"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = [[f"a{i % 10}", f"b{i % 5}", f"c{i % 3}"] for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.str.join("-")

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.str.join("-")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "str_join",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
