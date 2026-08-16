"""
Benchmark: elem_ops — Series.abs(), DataFrame.abs(), Series.round(), DataFrame.round()

Matches bench_elem_ops.ts: 100k-row Series/DataFrame, abs() and round() ops.
"""
import json
import time
import pandas as pd
import numpy as np

N = 100_000
WARMUP = 3
ITERS = 20

# Build dataset matching the TypeScript version
data = [(i % 1001) - 500 + (i % 7) * 0.1234 for i in range(N)]

series = pd.Series(data)
df = pd.DataFrame({
    "a": data,
    "b": [-v for v in data],
    "c": [v * 1.5 for v in data],
})


def bench(fn):
    for _ in range(WARMUP):
        fn()
    t0 = time.perf_counter()
    for _ in range(ITERS):
        fn()
    return (time.perf_counter() - t0) / ITERS * 1000  # ms


series_abs_ms = bench(lambda: series.abs())
df_abs_ms = bench(lambda: df.abs())
series_round_ms = bench(lambda: series.round(2))
df_round_ms = bench(lambda: df.round(2))

mean_ms = (series_abs_ms + df_abs_ms + series_round_ms + df_round_ms) / 4

print(json.dumps({
    "function": "elem_ops",
    "mean_ms": round(mean_ms, 3),
    "iterations": ITERS,
    "total_ms": round(mean_ms * ITERS, 3),
    "details": {
        "series_abs_ms": round(series_abs_ms, 3),
        "df_abs_ms": round(df_abs_ms, 3),
        "series_round_ms": round(series_round_ms, 3),
        "df_round_ms": round(df_round_ms, 3),
    },
}))
