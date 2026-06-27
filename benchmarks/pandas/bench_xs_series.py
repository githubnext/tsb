"""
Benchmark: Series.xs() — cross-section lookup on Series.

Mirrors tsb xsSeries.
Tests flat-index lookup (returns scalar) and MultiIndex lookup (returns sub-Series).
Outputs JSON: {"function": "xs_series", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""

import json
import time

import pandas as pd

N = 1_000
WARMUP = 10
ITERATIONS = 5_000

# Flat-index Series: each key appears once → xs returns a scalar.
flat_series = pd.Series(
    [i * 1.5 for i in range(N)],
    index=[f"k{i}" for i in range(N)],
    name="flat",
)

# MultiIndex Series: 10 outer keys × 100 inner keys → xs returns a sub-Series (100 rows).
outer_keys = [f"g{i // 100}" for i in range(N)]
inner_keys = [i % 100 for i in range(N)]
multi_index = pd.MultiIndex.from_arrays([outer_keys, inner_keys], names=["outer", "inner"])
multi_series = pd.Series(
    [i * 2.0 for i in range(N)],
    index=multi_index,
    name="multi",
)

# Warm-up
for i in range(WARMUP):
    flat_series.xs(f"k{i % N}")
    multi_series.xs(f"g{i % 10}")

start = time.perf_counter()
for i in range(ITERATIONS):
    flat_series.xs(f"k{i % N}")
    multi_series.xs(f"g{i % 10}")
total_ms = (time.perf_counter() - start) * 1000

print(
    json.dumps(
        {
            "function": "xs_series",
            "mean_ms": total_ms / ITERATIONS,
            "iterations": ITERATIONS,
            "total_ms": total_ms,
        }
    )
)
