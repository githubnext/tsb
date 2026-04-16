import pandas as pd, time, json
import numpy as np
N = 100_000
data = [i * 0.001 for i in range(N)]
s = pd.Series(data)
WARMUP = 3
ITERS = 20
for _ in range(WARMUP):
    s.quantile(0.25)
    s.quantile(0.5)
    s.quantile(0.75)
t0 = time.perf_counter()
for _ in range(ITERS):
    s.quantile(0.25)
    s.quantile(0.5)
    s.quantile(0.75)
total = (time.perf_counter() - t0) * 1000
print(json.dumps({"function": "quantile", "mean_ms": total / ITERS, "iterations": ITERS, "total_ms": total}))
