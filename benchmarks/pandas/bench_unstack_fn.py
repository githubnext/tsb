"""
Benchmark: unstack standalone — pivot innermost MultiIndex level to columns using s.unstack().
Mirrors bench_unstack_fn.ts.
Outputs JSON: {"function": "unstack_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

ROWS = 500
COLS = 10
WARMUP = 5
ITERATIONS = 50

data = [i * 1.0 for i in range(ROWS * COLS)]
index = pd.MultiIndex.from_tuples(
    [(i // COLS, i % COLS) for i in range(ROWS * COLS)]
)
s = pd.Series(data, index=index)

for _ in range(WARMUP):
    s.unstack()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    s.unstack()
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
mean_ms = total_ms / len(times)

print(
    json.dumps(
        {
            "function": "unstack_fn",
            "mean_ms": mean_ms,
            "iterations": ITERATIONS,
            "total_ms": total_ms,
        }
    )
)
