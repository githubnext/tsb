"""Benchmark: tseries offsets — QuarterEnd, QuarterBegin, BMonthEnd, BMonthBegin, BYearEnd, BYearBegin.
Tests apply (arithmetic add) and rollforward / rollback on 5,000 dates.
Outputs JSON: {"function": "tseries_offsets", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd
from pandas.tseries.offsets import (
    QuarterEnd,
    QuarterBegin,
    BMonthEnd,
    BMonthBegin,
    BYearEnd,
    BYearBegin,
)
from datetime import timedelta

SIZE = 5_000
WARMUP = 5
ITERATIONS = 50

q_end = QuarterEnd(1)
q_begin = QuarterBegin(1)
bm_end = BMonthEnd(1)
bm_begin = BMonthBegin(1)
by_end = BYearEnd(1)
by_begin = BYearBegin(1)

base = pd.Timestamp("2020-01-15")
dates = [base + timedelta(days=i) for i in range(SIZE)]


def run() -> None:
    for d in dates:
        _ = d + q_end
        _ = q_end.rollforward(d)
        _ = q_end.rollback(d)
        _ = d + q_begin
        _ = d + bm_end
        _ = d + bm_begin
        _ = d + by_end
        _ = d + by_begin


for _ in range(WARMUP):
    run()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    run()
    times.append(time.perf_counter() - t0)

total_ms = sum(times) * 1000
print(
    json.dumps(
        {
            "function": "tseries_offsets",
            "mean_ms": total_ms / ITERATIONS,
            "iterations": ITERATIONS,
            "total_ms": total_ms,
        }
    )
)
