"""Benchmark: str_is_alpha_digit — str.isalpha and str.isdigit on 100k strings"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = ["hello" if i % 2 == 0 else "12345" for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.str.isalpha()
    s.str.isdigit()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.str.isalpha()
    s.str.isdigit()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "str_is_alpha_digit",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
