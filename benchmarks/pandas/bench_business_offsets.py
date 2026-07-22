"""
Benchmark: Business and Quarter date offsets — QuarterEnd, QuarterBegin,
BMonthEnd, BMonthBegin, BYearEnd, BYearBegin.
Mirrors tsb bench_business_offsets.ts.
Dataset: 5,000 dates; 50 measured iterations.
Outputs JSON: {"function": "business_offsets", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
from datetime import datetime, timedelta, timezone

import pandas as pd
from pandas.tseries.offsets import (
    BMonthBegin,
    BMonthEnd,
    BYearBegin,
    BYearEnd,
    QuarterBegin,
    QuarterEnd,
)

SIZE = 5_000
WARMUP = 5
ITERATIONS = 50

q_end = QuarterEnd(1)
q_begin = QuarterBegin(1)
bm_end = BMonthEnd(1)
bm_begin = BMonthBegin(1)
by_end = BYearEnd(1)
by_begin = BYearBegin(1)

base = datetime(2020, 1, 15, tzinfo=timezone.utc)
dates = [base + timedelta(days=i) for i in range(SIZE)]
ts_dates = [pd.Timestamp(d) for d in dates]

for _ in range(WARMUP):
    for d in ts_dates[:100]:
        d + q_end
        d + q_begin
        d + bm_end
        d + bm_begin
        d + by_end
        d + by_begin

t0 = time.perf_counter()
for _ in range(ITERATIONS):
    for d in ts_dates:
        d + q_end
        d + q_begin
        d + bm_end
        d + bm_begin
        d + by_end
        d + by_begin
total_ms = (time.perf_counter() - t0) * 1000
mean_ms = total_ms / ITERATIONS

print(json.dumps({"function": "business_offsets", "mean_ms": mean_ms, "iterations": ITERATIONS, "total_ms": total_ms}))
