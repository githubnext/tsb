"""Benchmark: DataFrame.query and DataFrame.eval with built-in functions.
Tests abs(), round(), lower(), upper(), isnull(), and `in` membership.
Dataset: 50k-row DataFrame with numeric and string columns.
Outputs JSON: {"function": "eval_query_functions", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

ROWS = 50_000
WARMUP = 3
ITERATIONS = 20

categories = ["alpha", "beta", "gamma", "delta", "epsilon"]

df = pd.DataFrame({
    "val": np.where(
        np.arange(ROWS) % 2 == 0,
        -(np.arange(ROWS) * 0.5),
        np.arange(ROWS) * 0.5,
    ),
    "score": np.sin(np.arange(ROWS) * 0.01) * 100,
    "label": [categories[i % len(categories)] for i in range(ROWS)],
    "flag": [None if i % 3 == 0 else float(i) for i in range(ROWS)],
})


def run() -> None:
    # abs() on a column with negative values
    df.eval("abs(val)")
    # round() on a floating-point column
    df.eval("round(score, 1)")
    # lower() on a string column (pandas does not have lower() in eval, use str accessor)
    df["label"].str.lower()
    # isnull() to detect nulls
    df.eval("flag.isnull()", engine="python")
    # `in` membership operator
    df.query("label in ['alpha', 'beta']")
    # combined: abs + comparison + isnull
    df.query("abs(val) > 10000 and flag.isnull() == False", engine="python")


for _ in range(WARMUP):
    run()

start = time.perf_counter()
for _ in range(ITERATIONS):
    run()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "eval_query_functions",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
