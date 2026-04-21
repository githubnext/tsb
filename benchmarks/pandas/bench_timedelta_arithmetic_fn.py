"""
Benchmark: pandas Timedelta add/sub/abs — basic Timedelta arithmetic.
Mirrors tsb bench_timedelta_arithmetic_fn.ts.
Outputs JSON: {"function": "timedelta_arithmetic_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

WARMUP = 5
ITERATIONS = 100

SIZE = 1_000
td1 = pd.Timedelta(days=1, hours=6)
td2 = pd.Timedelta(hours=2, minutes=30)
ms_value = 7_200_000  # 2 hours in ms

deltas = [pd.Timedelta(milliseconds=(i - SIZE // 2) * 60_000) for i in range(SIZE)]

for _ in range(WARMUP):
    pd.Timedelta(milliseconds=ms_value)
    for td in deltas[:50]:
        td + td1
        td - td2
        abs(td)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    pd.Timedelta(milliseconds=ms_value)
    for td in deltas:
        td + td1
        td - td2
        abs(td)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({
    "function": "timedelta_arithmetic_fn",
    "mean_ms": round(total_ms / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
