"""Benchmark: df.style — DataFrame Styler highlighting and HTML rendering.

Mirrors tsb dataFrameStyle(df) from src/stats/style.ts.
"""
import json
import time
import numpy as np
import pandas as pd

ROWS = 200
WARMUP = 3
ITERATIONS = 50

df = pd.DataFrame(
    {
        "a": np.arange(ROWS) * 1.5,
        "b": np.sin(np.arange(ROWS)) * 100,
        "c": np.arange(ROWS) % 50,
    }
)

for _ in range(WARMUP):
    df.style.highlight_max().to_html()
    df.style.highlight_min(color="lightblue").to_html()
    df.style.format("{:.2f}").to_html()
    df.style.background_gradient().to_html()

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.style.highlight_max().to_html()
    df.style.highlight_min(color="lightblue").to_html()
    df.style.format("{:.2f}").to_html()
    df.style.background_gradient().to_html()
total_ms = (time.perf_counter() - start) * 1000

print(
    json.dumps(
        {
            "function": "style",
            "mean_ms": total_ms / ITERATIONS,
            "iterations": ITERATIONS,
            "total_ms": total_ms,
        }
    )
)
