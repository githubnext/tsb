"""
Benchmark: pandas USFederalHolidayCalendar.holidays() over a 10-year range
"""
import json
import time
import pandas as pd
from pandas.tseries.holiday import USFederalHolidayCalendar

WARMUP = 5
ITERATIONS = 20

start_date = "2000-01-01"
end_date = "2009-12-31"

for _ in range(WARMUP):
    cal = USFederalHolidayCalendar()
    cal.holidays(start_date, end_date)

t0 = time.perf_counter()
for _ in range(ITERATIONS):
    cal = USFederalHolidayCalendar()
    cal.holidays(start_date, end_date)
total = (time.perf_counter() - t0) * 1000  # ms

print(json.dumps({
    "function": "us_federal_holidays",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
