import pandas as pd, time, json
from scipy import stats as sp_stats
N = 100_000
data = [(i % 1000) * 0.1 for i in range(N)]
WARMUP = 3
ITERS = 20
for _ in range(WARMUP):
    sp_stats.percentileofscore(data, 50.0)
t0 = time.perf_counter()
for _ in range(ITERS):
    sp_stats.percentileofscore(data, 50.0)
total = (time.perf_counter() - t0) * 1000
print(json.dumps({"function": "percentile_of_score", "mean_ms": total / ITERS, "iterations": ITERS, "total_ms": total}))
