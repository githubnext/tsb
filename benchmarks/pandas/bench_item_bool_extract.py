"""
Benchmark: Series.item() / bool(Series) / bool(DataFrame) — single-element scalar extraction.

Mirrors tsb bench_item_bool_extract.
Outputs JSON: {"function": "item_bool_extract", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

WARMUP = 20
ITERATIONS = 100_000

numeric_series = pd.Series([42.5])
true_series = pd.Series([True])
true_df = pd.DataFrame({"x": [True]})

for _ in range(WARMUP):
    numeric_series.item()
    bool(true_series)
    bool(true_df)

start = time.perf_counter()
for _ in range(ITERATIONS):
    numeric_series.item()
    bool(true_series)
    bool(true_df)
total_ms = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "item_bool_extract",
    "mean_ms": total_ms / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
