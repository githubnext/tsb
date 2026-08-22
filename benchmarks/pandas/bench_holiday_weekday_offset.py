"""
Benchmark: Holiday with weekday offsets — MO, TH, FR.

Creates a custom holiday calendar with floating weekday-anchored holidays
(e.g. "3rd Monday of January") and generates dates over a 10-year range.

Mirrors tsb's Holiday with offset=MO(3) etc.

Outputs JSON: {"function": "holiday_weekday_offset", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time

try:
    from pandas.tseries.holiday import (
        AbstractHolidayCalendar,
        Holiday,
        MO,
        TH,
        FR,
        nearest_workday,
    )
    from pandas import Timestamp
    from pandas.tseries.offsets import DateOffset
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False

WARMUP = 5
ITERATIONS = 30

start_date = "2010-01-01"
end_date = "2019-12-31"

if HAS_PANDAS:
    class WeekdayOffsetCalendar(AbstractHolidayCalendar):
        rules = [
            # 3rd Monday of January (like MLK Day)
            Holiday("Third Monday Jan", month=1, day=1, offset=DateOffset(weekday=MO(3))),
            # 3rd Monday of February (like Presidents Day)
            Holiday("Third Monday Feb", month=2, day=1, offset=DateOffset(weekday=MO(3))),
            # Last Monday of May (like Memorial Day)
            Holiday("Last Monday May", month=5, day=31, offset=DateOffset(weekday=MO(-1))),
            # 1st Monday of September (like Labor Day)
            Holiday("First Monday Sep", month=9, day=1, offset=DateOffset(weekday=MO(1))),
            # 2nd Monday of October (like Columbus Day)
            Holiday("Second Monday Oct", month=10, day=1, offset=DateOffset(weekday=MO(2))),
            # 4th Thursday of November (like Thanksgiving)
            Holiday("Fourth Thursday Nov", month=11, day=1, offset=DateOffset(weekday=TH(4))),
            # Last Friday of October
            Holiday("Last Friday Oct", month=10, day=31, offset=DateOffset(weekday=FR(-1))),
            # Fixed holiday with observance
            Holiday("Christmas", month=12, day=25, observance=nearest_workday),
        ]

    # Warm up
    for _ in range(WARMUP):
        cal = WeekdayOffsetCalendar()
        cal.holidays(start_date, end_date)

    # Measure
    t0 = time.perf_counter()
    for _ in range(ITERATIONS):
        cal = WeekdayOffsetCalendar()
        cal.holidays(start_date, end_date)
    total_s = time.perf_counter() - t0
    total_ms = total_s * 1000.0
else:
    total_ms = 0.0

print(json.dumps({
    "function": "holiday_weekday_offset",
    "mean_ms": round(total_ms / ITERATIONS, 4),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 4),
}))
