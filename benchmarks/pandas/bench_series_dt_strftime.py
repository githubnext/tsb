import pandas as pd, time, json
N = 100_000
dates = pd.date_range("2020-01-01", periods=N, freq="D")
s = pd.Series(dates)
WARMUP = 3
ITERS = 20
for _ in range(WARMUP):
    s.dt.strftime("%Y-%m-%d")
t0 = time.perf_counter()
for _ in range(ITERS):
    s.dt.strftime("%Y-%m-%d")
total = (time.perf_counter() - t0) * 1000
print(json.dumps({"function": "series_dt_strftime", "mean_ms": total / ITERS, "iterations": ITERS, "total_ms": total}))
