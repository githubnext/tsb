"""
Benchmark: Series.to_markdown() and Series.to_latex() on a 500-element numeric Series.

Mirrors tsb seriesToMarkdown and seriesToLaTeX.
Outputs JSON: {"function": "series_to_markdown", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

SIZE = 500
WARMUP = 5
ITERATIONS = 50

s = pd.Series([(i * 1.7) % 100 for i in range(SIZE)], name="values")

for _ in range(WARMUP):
    s.to_markdown()
    s.to_latex()

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.to_markdown()
    s.to_latex()
total_ms = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_to_markdown",
    "mean_ms": total_ms / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
