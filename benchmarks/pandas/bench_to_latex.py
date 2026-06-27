"""Benchmark: toLaTeX / seriesToLaTeX — DataFrame.to_latex() and Series.to_latex() on 500 rows.

Mirrors tsb toLaTeX(df) / seriesToLaTeX(s) from src/stats/format_table.ts.
"""
import json
import time
import numpy as np
import pandas as pd

ROWS = 500
WARMUP = 5
ITERATIONS = 100

df = pd.DataFrame(
    {
        "name": [f"item_{i}" for i in range(ROWS)],
        "value": np.arange(ROWS) * 1.23,
        "count": np.arange(ROWS, dtype=float),
    }
)
s = pd.Series(np.arange(ROWS) * 0.5)

for _ in range(WARMUP):
    df.to_latex()
    df.to_latex(index=False)
    s.to_latex()

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.to_latex()
    df.to_latex(index=False)
    s.to_latex()
total_ms = (time.perf_counter() - start) * 1000

print(
    json.dumps(
        {
            "function": "to_latex",
            "mean_ms": total_ms / ITERATIONS,
            "iterations": ITERATIONS,
            "total_ms": total_ms,
        }
    )
)
