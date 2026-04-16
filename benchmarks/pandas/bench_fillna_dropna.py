import pandas as pd, time, json
N = 100_000
data = [None if i % 7 == 0 else i * 1.5 for i in range(N)]
s = pd.Series(data)
WARMUP = 3
ITERS = 20
for _ in range(WARMUP):
    s.fillna(0)
    s.dropna()
t0 = time.perf_counter()
for _ in range(ITERS):
    s.fillna(0)
    s.dropna()
total = (time.perf_counter() - t0) * 1000
print(json.dumps({"function": "fillna_dropna", "mean_ms": total / ITERS, "iterations": ITERS, "total_ms": total}))
