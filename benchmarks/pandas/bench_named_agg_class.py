"""Benchmark: pd.NamedAgg class construction and isinstance validation — 100 specs × 1000 iters.
Mirrors tsb bench_named_agg_class.ts for pandas.
"""
import json, time
import pandas as pd

WARMUP = 5
ITERATIONS = 1_000
N = 100

sample_spec = {
    "total": pd.NamedAgg(column="salary", aggfunc="sum"),
    "avg": pd.NamedAgg(column="salary", aggfunc="mean"),
    "max": pd.NamedAgg(column="salary", aggfunc="max"),
    "cnt": pd.NamedAgg(column="headcount", aggfunc="count"),
}

def is_named_agg_spec(spec):
    return isinstance(spec, dict) and all(isinstance(v, pd.NamedAgg) for v in spec.values())

for _ in range(WARMUP):
    for _ in range(N):
        pd.NamedAgg(column="salary", aggfunc="sum")
        pd.NamedAgg(column="score", aggfunc="mean")
        is_named_agg_spec(sample_spec)
        is_named_agg_spec({"x": "not-namedagg"})

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    for _ in range(N):
        pd.NamedAgg(column="salary", aggfunc="sum")
        pd.NamedAgg(column="score", aggfunc="mean")
        is_named_agg_spec(sample_spec)
        is_named_agg_spec({"x": "not-namedagg"})
    times.append((time.perf_counter() - t0) * 1000)

total = sum(times)
mean = total / ITERATIONS
print(json.dumps({
    "function": "named_agg_class",
    "mean_ms": round(mean, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total, 3),
}))
