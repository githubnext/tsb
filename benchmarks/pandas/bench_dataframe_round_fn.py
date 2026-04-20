"""
Benchmark: dataFrameRound standalone — round a 100k-row × 4-column DataFrame to 2 decimals.
Mirrors bench_dataframe_round_fn.ts (uses df.round(2) which is the pandas equivalent).
Outputs JSON: {"function": "dataframe_round_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import math
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 30

df = pd.DataFrame(
    {
        "a": [i * 0.123456 for i in range(SIZE)],
        "b": [math.sin(i * 0.01) * 99.9 for i in range(SIZE)],
        "c": [-i * 0.987654 for i in range(SIZE)],
        "d": [(i % 1000) * 3.14159 for i in range(SIZE)],
    }
)

for _ in range(WARMUP):
    df.round(2)

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.round(2)
total = (time.perf_counter() - start) * 1000

print(
    json.dumps(
        {
            "function": "dataframe_round_fn",
            "mean_ms": total / ITERATIONS,
            "iterations": ITERATIONS,
            "total_ms": total,
        }
    )
)
