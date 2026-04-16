import pandas as pd, time, json
N = 100_000
s = pd.Series(range(N))
s.attrs = {"a": 1, "b": 2, "c": 3, "d": 4, "e": 5, "f": 6, "g": 7, "h": 8}
WARMUP = 3
ITERS = 10_000
for _ in range(WARMUP):
    _ = len(s.attrs)
    _ = list(s.attrs.keys())
t0 = time.perf_counter()
for _ in range(ITERS):
    _ = len(s.attrs)
    _ = list(s.attrs.keys())
total = (time.perf_counter() - t0) * 1000
print(json.dumps({"function": "attrs_count_keys", "mean_ms": total / ITERS, "iterations": ITERS, "total_ms": total}))
