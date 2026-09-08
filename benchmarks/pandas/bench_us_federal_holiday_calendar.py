"""
Benchmark: USFederalHolidayCalendar — pandas' built-in US federal holiday
calendar (11 rules, several with nth-weekday-of-month and observance
adjustment logic) applied over a 50-year date range.

Outputs JSON: {"function": "us_federal_holiday_calendar", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time

import pandas as pd
from pandas.tseries.holiday import USFederalHolidayCalendar

WARMUP = 5
ITERATIONS = 50

start_date = pd.Timestamp("1980-01-01")
end_date = pd.Timestamp("2029-12-31")

for _ in range(WARMUP):
    cal = USFederalHolidayCalendar()
    cal.holidays(start_date, end_date)

t0 = time.perf_counter()
for _ in range(ITERATIONS):
    cal = USFederalHolidayCalendar()
    cal.holidays(start_date, end_date)
total_ms = (time.perf_counter() - t0) * 1000

print(
    json.dumps(
        {
            "function": "us_federal_holiday_calendar",
            "mean_ms": round(total_ms / ITERATIONS, 3),
            "iterations": ITERATIONS,
            "total_ms": round(total_ms, 3),
        }
    )
)
