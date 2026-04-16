import pandas as pd, time, json
N = 100_000
dates = pd.date_range("2020-01-01", periods=N, freq="D")
s = pd.Series(dates)
WARMUP = 3
ITERS = 20
for _ in range(WARMUP):
    s.dt.year
    s.dt.month
    s.dt.dayofweek
t0 = time.perf_counter()
for _ in range(ITERS):
    s.dt.year
    s.dt.month
    s.dt.dayofweek
total = (time.perf_counter() - t0) * 1000
print(json.dumps({"function": "datetime_accessor", "mean_ms": total / ITERS, "iterations": ITERS, "total_ms": total}))
