"""Benchmark: Series.add/sub/mul/div — element-wise arithmetic."""
import json
import time

import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

data = [float(i) for i in range(SIZE)]
s = pd.Series(data)
s2 = pd.Series([v * 2 for v in data])

for _ in range(WARMUP):
    s.add(10)
    s.sub(5)
    s.mul(3)
    s.div(2)
    s.add(s2)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.add(10)
    s.sub(5)
    s.mul(3)
    s.div(2)
    s.add(s2)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(
    json.dumps(
        {
            "function": "add_sub_mul_div",
            "mean_ms": round(total_ms / ITERATIONS, 3),
            "iterations": ITERATIONS,
            "total_ms": round(total_ms, 3),
        }
    )
)
