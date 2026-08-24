"""
Benchmark: pandas.Index set operations — union, intersection, difference on 10k-element indexes.

Mirrors tsb Index.union(), .intersection(), and .difference().

Dataset: two 10 000-element integer indexes with 50% overlap.
Outputs JSON: {"function": "index_setops", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time

import pandas as pd

N = 10_000
WARMUP = 5
ITERATIONS = 50

# a = [0..9999], b = [5000..14999] — 5000-element overlap
a = pd.Index(range(N))
b = pd.Index(range(N // 2, N + N // 2))


def run() -> None:
    a.union(b)
    a.intersection(b)
    a.difference(b)


for _ in range(WARMUP):
    run()

start = time.perf_counter()
for _ in range(ITERATIONS):
    run()
total = (time.perf_counter() - start) * 1000  # ms

print(
    json.dumps(
        {
            "function": "index_setops",
            "mean_ms": total / ITERATIONS,
            "iterations": ITERATIONS,
            "total_ms": total,
        }
    )
)
