"""
Benchmark: IntervalIndex.get_indexer / IntervalIndex.overlaps — interval lookup and overlap queries.
Mirrors tsb IntervalIndex.indexOf / IntervalIndex.overlapping methods.
Outputs JSON: {"function": "interval_index_query", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd
import numpy as np

WARMUP = 5
ITERATIONS = 50

BREAKS = 501
breaks = [i * 2 for i in range(BREAKS)]
idx = pd.IntervalIndex.from_breaks(breaks)

queries = [i * 0.999 for i in range(1_000)]
query_interval = pd.Interval(200, 400)

for _ in range(WARMUP):
    idx.get_indexer(queries[:50])
    idx.overlaps(query_interval)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    idx.get_indexer(queries)
    idx.overlaps(query_interval)
    times.append((time.perf_counter() - t0) * 1000)

total = sum(times)
print(json.dumps({
    "function": "interval_index_query",
    "mean_ms": round(total / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total, 3),
}))
