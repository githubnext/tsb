"""Benchmark: DateOffset — MonthEnd, BusinessDay, YearBegin apply."""
import json, time
import pandas as pd
from pandas.tseries.offsets import MonthEnd, BusinessDay, YearBegin, Day
from datetime import datetime, timezone, timedelta

SIZE = 10_000
WARMUP = 5
ITERATIONS = 50

month_end = MonthEnd(1)
biz_day = BusinessDay(5)
year_begin = YearBegin(1)
day_off = Day(30)
base = pd.Timestamp("2020-01-15", tz="UTC")
dates = [base + timedelta(days=i) for i in range(SIZE)]

for _ in range(WARMUP):
    for d in dates:
        d + month_end
        d + biz_day
        d + year_begin
        d + day_off

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    for d in dates:
        d + month_end
        d + biz_day
        d + year_begin
        d + day_off
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function":"date_offset","mean_ms":round(total_ms/ITERATIONS,3),"iterations":ITERATIONS,"total_ms":round(total_ms,3)}))
