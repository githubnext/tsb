"""
Benchmark: pandas pd.to_timedelta() — convert strings, numbers, and arrays to timedelta.
Mirrors tsb bench_to_timedelta_convert.ts.
Outputs JSON: {"function": "to_timedelta_convert", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

WARMUP = 5
ITERATIONS = 50

strings = [
    "1 days 02:03:04",
    "0 days 00:30:00",
    "5 days 12:00:00.500",
    "PT1H30M",
    "P7D",
    "-PT2H45M30S",
    "2h 30m 15s",
    "1 day 00:00:00",
]

numbers = [86400, 3600, 1800, 7200, 0, -3600]

SIZE = 1_000
str_array = [f"{i % 100} days {(i % 24):02d}:00:00" for i in range(SIZE)]
num_array = [i * 3600 for i in range(SIZE)]

for _ in range(WARMUP):
    for s in strings:
        pd.to_timedelta(s)
    for n in numbers:
        pd.to_timedelta(n, unit="s")
    pd.to_timedelta(str_array)
    pd.to_timedelta(num_array, unit="s")

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    for _ in range(100):
        for s in strings:
            pd.to_timedelta(s)
        for n in numbers:
            pd.to_timedelta(n, unit="s")
    pd.to_timedelta(str_array)
    pd.to_timedelta(num_array, unit="s")
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({
    "function": "to_timedelta_convert",
    "mean_ms": round(total_ms / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
