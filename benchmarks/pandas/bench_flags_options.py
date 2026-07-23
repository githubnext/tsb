"""
Benchmark: flags and options (pandas equivalent)

Measures:
 - DataFrame.flags.allows_duplicate_labels get+set
 - pd.get_option / pd.set_option / pd.reset_option for multiple keys
 - pd.options proxy read

Dataset: 10,000-row Series and DataFrame; 20 measured iterations.
"""

import json
import time

import numpy as np
import pandas as pd

N = 10_000
WARMUP = 5
ITERS = 20

data = np.arange(N, dtype=np.float64)
s = pd.Series(data)
df = pd.DataFrame({"a": data, "b": data})


def bench_flags_options():
    sink = 0
    for _ in range(ITERS + WARMUP):
        # flags on Series
        prev = s.flags.allows_duplicate_labels
        s.flags.allows_duplicate_labels = not prev
        s.flags.allows_duplicate_labels = prev
        sink ^= int(s.flags.allows_duplicate_labels)

        # flags on DataFrame
        prev_df = df.flags.allows_duplicate_labels
        df.flags.allows_duplicate_labels = not prev_df
        df.flags.allows_duplicate_labels = prev_df
        sink ^= int(df.flags.allows_duplicate_labels)

        # options get/set/reset
        v = pd.get_option("display.max_rows")
        pd.set_option("display.max_rows", v + 1)
        pd.reset_option("display.max_rows")
        sink ^= int(pd.options.display.max_rows > 0)

        pd.set_option("display.max_columns", 20)
        pd.reset_option("display.max_columns")
        sink ^= int(pd.options.display.max_columns > 0)

    return sink


# Warm-up
bench_flags_options()

# Measure
t0 = time.perf_counter()
for _ in range(ITERS):
    bench_flags_options()
total = (time.perf_counter() - t0) * 1000  # ms

print(
    json.dumps(
        {
            "function": "flags_options",
            "mean_ms": total / ITERS,
            "iterations": ITERS,
            "total_ms": total,
        }
    )
)
