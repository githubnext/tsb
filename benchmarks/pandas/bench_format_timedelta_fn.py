"""
Benchmark: pandas Timedelta string formatting — str(Timedelta) and parsing.
Mirrors tsb bench_format_timedelta_fn.ts (formatTimedelta/parseFrac).
Outputs JSON: {"function": "format_timedelta_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

WARMUP = 5
ITERATIONS = 50

tds = [
    pd.Timedelta(days=1),
    pd.Timedelta(seconds=3661),
    pd.Timedelta(milliseconds=90061001),
    pd.Timedelta(seconds=0),
    pd.Timedelta(seconds=-86400),
]

for _ in range(WARMUP):
    for td in tds:
        str(td)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    for _ in range(1000):
        for td in tds:
            str(td)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({
    "function": "format_timedelta_fn",
    "mean_ms": round(total_ms / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
