"""
Benchmark: pd.describe_option() / pd.option_context() — pandas options describe and context manager.

Mirrors tsb bench_option_context (describeOption + optionContext enter/exit).
Outputs JSON: {"function": "option_context", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

WARMUP = 20
ITERATIONS = 50_000

for _ in range(WARMUP):
    pd.describe_option("display.max_rows")
    pd.describe_option("display.precision")
    with pd.option_context("display.max_rows", 50, "display.precision", 3):
        pass

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.describe_option("display.max_rows")
    pd.describe_option("display.precision")
    with pd.option_context("display.max_rows", 50, "display.precision", 3):
        pass
total_ms = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "option_context",
    "mean_ms": total_ms / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
