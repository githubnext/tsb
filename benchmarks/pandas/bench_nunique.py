"""Benchmark: nunique — Series.nunique() and DataFrame.nunique()

Compares pandas Series.nunique() / DataFrame.nunique() against tsb equivalents
on a 100 000-row dataset with ~1 000 distinct values so deduplication is meaningful.
"""
import json
import time

import numpy as np
import pandas as pd

N = 100_000
DISTINCT = 1_000  # cardinality
WARMUP = 5
ITERS = 50

# Build datasets once — mirrors the TypeScript benchmark
num_data = np.arange(N) % DISTINCT
str_data = pd.array([f"cat_{v}" for v in num_data], dtype="object")

num_series = pd.Series(num_data)
str_series = pd.Series(str_data)

df = pd.DataFrame(
    {
        "a": num_data,
        "b": (num_data * 7) % DISTINCT,
        "c": (num_data * 13) % DISTINCT,
        "d": (num_data * 17) % DISTINCT,
    }
)


def bench(fn, warmup: int, iters: int) -> float:
    for _ in range(warmup):
        fn()
    t0 = time.perf_counter()
    for _ in range(iters):
        fn()
    return (time.perf_counter() - t0) / iters * 1000  # ms


mean_num = bench(num_series.nunique, WARMUP, ITERS)
mean_str = bench(str_series.nunique, WARMUP, ITERS)
mean_df = bench(df.nunique, WARMUP, ITERS)

mean_ms = (mean_num + mean_str + mean_df) / 3

print(
    json.dumps(
        {
            "function": "nunique",
            "mean_ms": round(mean_ms, 3),
            "iterations": ITERS,
            "total_ms": round((mean_num + mean_str + mean_df) * ITERS, 3),
            "details": {
                "series_numeric_ms": round(mean_num, 3),
                "series_string_ms": round(mean_str, 3),
                "dataframe_ms": round(mean_df, 3),
            },
        }
    )
)
