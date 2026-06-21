"""
Benchmark: pandas Series.to_markdown() and Series.to_latex() on a 500-element Series.

Mirrors the tsb seriesToMarkdown and seriesToLaTeX benchmark.
Exercises table-rendering of both numeric and string series.
"""
import json
import time
import math
import pandas as pd

N = 500
WARMUP = 3
ITERATIONS = 30

num_data = [math.sin(i * 0.05) * 100 for i in range(N)]
str_data = [None if i % 10 == 0 else f"item_{i}" for i in range(N)]

num_series = pd.Series(num_data)
str_series = pd.Series(str_data)

# Warm-up
for _ in range(WARMUP):
    num_series.to_markdown()
    num_series.to_latex()
    str_series.to_markdown()
    str_series.to_latex()

start = time.perf_counter()
for _ in range(ITERATIONS):
    num_series.to_markdown()
    num_series.to_latex()
    str_series.to_markdown()
    str_series.to_latex()
total_ms = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_format_table",
    "mean_ms": total_ms / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
