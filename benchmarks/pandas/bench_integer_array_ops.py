"""Benchmark: IntegerArray arithmetic extensions — sub, floordiv, mod, pow, astype, count.

Covers pandas IntegerArray operations not in bench_integer_array:
  - arr - 10        → sub(scalar)
  - arr // 7        → floor division
  - arr % 13        → modulo
  - arr ** 2        → power
  - arr.astype("Int64")
  - arr.count()     → non-null count

Dataset: 100,000 Int32 elements with ~10% nulls (same as bench_integer_array).
"""
import json
import time

import pandas as pd

N = 100_000
WARMUP = 3
ITERATIONS = 20

raw = [(None if i % 10 == 0 else int((i % 1000) - 500)) for i in range(N)]
a = pd.array(raw, dtype="Int32")


def run():
    _ = a - 10
    _ = a // 7
    _ = a % 13
    _ = a ** 2
    _ = a.astype("Int64")
    _ = a.count()


for _ in range(WARMUP):
    run()

start = time.perf_counter()
for _ in range(ITERATIONS):
    run()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "integer_array_ops",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
