import pandas as pd, time, json
N = 10_000
s = pd.Series(range(N))
attrs_data = {"unit": "meters", "created": "2024-01-01", "source": "sensor-1", "version": 2}
WARMUP = 3
ITERS = 100
for _ in range(WARMUP):
    s.attrs.update(attrs_data)
    _ = dict(s.attrs)
    s.attrs["version"] = 99
    s2 = s.copy()
    s2.attrs.update({"extra": "x"})
t0 = time.perf_counter()
for i in range(ITERS):
    s.attrs.update(attrs_data)
    _ = dict(s.attrs)
    s.attrs["version"] = i
    s2 = s.copy()
    s2.attrs.update({"extra": "x"})
total = (time.perf_counter() - t0) * 1000
print(json.dumps({"function": "attrs_ops", "mean_ms": total / ITERS, "iterations": ITERS, "total_ms": total}))
