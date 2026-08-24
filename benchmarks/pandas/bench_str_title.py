"""
Benchmark: str_title — pandas Series.str.title() titlecase conversion on 100k strings.
Outputs JSON: {"function": "str_title", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time

import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

data = [f"hello world example {i % 500} foo bar" for i in range(ROWS)]
s = pd.Series(data)

for _ in range(WARMUP):
    s.str.title()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.str.title()
total = (time.perf_counter() - start) * 1000  # ms

print(
    json.dumps(
        {
            "function": "str_title",
            "mean_ms": total / ITERATIONS,
            "iterations": ITERATIONS,
            "total_ms": total,
        }
    )
)
