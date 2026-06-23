"""
Benchmark: get_option / set_option / reset_option — pandas options API.

Mirrors tsb getOption / setOption / resetOption.
Outputs JSON: {"function": "get_set_option", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""

import json
import time

import pandas as pd

WARMUP = 10
ITERATIONS = 10_000

# Warm-up
for _ in range(WARMUP):
    pd.get_option("display.max_rows")
    pd.set_option("display.max_rows", 50)
    pd.reset_option("display.max_rows")
    pd.get_option("display.precision")
    pd.set_option("display.precision", 3)
    pd.reset_option("display.precision")

start = time.perf_counter()
for i in range(ITERATIONS):
    pd.get_option("display.max_rows")
    pd.set_option("display.max_rows", (i % 90) + 10)
    pd.reset_option("display.max_rows")
    pd.get_option("display.precision")
    pd.set_option("display.precision", (i % 8) + 2)
    pd.reset_option("display.precision")
total_ms = (time.perf_counter() - start) * 1000

print(
    json.dumps(
        {
            "function": "get_set_option",
            "mean_ms": total_ms / ITERATIONS,
            "iterations": ITERATIONS,
            "total_ms": total_ms,
        }
    )
)
