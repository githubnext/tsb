"""
Benchmark: pandas custom AbstractHolidayCalendar — custom calendar definition,
holiday generation, and calendar registry (get_calendar / register).

Creates a small custom calendar with 5 fixed-date rules and measures how long
it takes to compute the observed holiday dates for a 20-year range.

Outputs JSON: {"function": "holiday_calendar", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
from datetime import datetime

import pandas as pd
from pandas.tseries.holiday import AbstractHolidayCalendar, Holiday, register

WARMUP = 5
ITERATIONS = 50

# ── Custom calendar with 5 fixed-date holidays ────────────────────────────────

class CustomCalendar(AbstractHolidayCalendar):
    name = "BenchCustomCalendar"
    rules = [
        Holiday("New Year's Day", month=1, day=1),
        Holiday("Valentine's Day", month=2, day=14),
        Holiday("May Day", month=5, day=1),
        Holiday("Midsummer", month=6, day=24),
        Holiday("Christmas Day", month=12, day=25),
    ]

register(CustomCalendar)

start_date = datetime(2000, 1, 1)
end_date = datetime(2019, 12, 31)

# Warm up
for _ in range(WARMUP):
    cal = CustomCalendar()
    cal.holidays(start=start_date, end=end_date)
    AbstractHolidayCalendar.get_calendar("BenchCustomCalendar")

t0 = time.perf_counter()
for _ in range(ITERATIONS):
    cal = CustomCalendar()
    cal.holidays(start=start_date, end=end_date)
    AbstractHolidayCalendar.get_calendar("BenchCustomCalendar")
total = (time.perf_counter() - t0) * 1000

print(json.dumps({
    "function": "holiday_calendar",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
