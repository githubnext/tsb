"""
Benchmark: Holiday observance functions from pandas.tseries.holiday.

Compares against tsb (TypeScript) bench_holiday_observances.ts.
"""
import datetime
import json
import time

from pandas.tseries.holiday import (
    nearest_workday,
    next_monday,
    next_monday_or_tuesday,
    previous_friday,
    previous_workday,
    sunday_to_monday,
)

N = 1_000
WARMUP = 5
ITERS = 50

base = datetime.date(2000, 1, 1)
dates = [base + datetime.timedelta(days=i) for i in range(N)]

# warm-up
for _ in range(WARMUP):
    for d in dates:
        nearest_workday(d)
        next_monday(d)
        next_monday_or_tuesday(d)
        previous_friday(d)
        previous_workday(d)
        sunday_to_monday(d)

t0 = time.perf_counter()
for _ in range(ITERS):
    for d in dates:
        nearest_workday(d)
        next_monday(d)
        next_monday_or_tuesday(d)
        previous_friday(d)
        previous_workday(d)
        sunday_to_monday(d)
total_ms = (time.perf_counter() - t0) * 1000

print(
    json.dumps(
        {
            "function": "holiday_observances",
            "mean_ms": total_ms / ITERS,
            "iterations": ITERS,
            "total_ms": total_ms,
        }
    )
)
