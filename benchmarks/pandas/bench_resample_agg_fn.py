"""
Benchmark: resample_agg_fn — custom aggregation function with resample().agg(fn).

Mirrors tsb: s.resample("H").agg(p75) and s.resample("H").agg(rangeAgg)
pandas:      s.resample("H").agg(lambda x: x.quantile(0.75))
             s.resample("H").agg(lambda x: x.max() - x.min())

50k-row minute-resolution Series; 30 measured iterations.
Outputs JSON: {"function": "resample_agg_fn", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 50_000
WARMUP = 3
ITERATIONS = 30

idx = pd.date_range("2020-01-01", periods=SIZE, freq="1min")
data = np.sin(np.arange(SIZE) * 0.05) * 50 + 50
s = pd.Series(data, index=idx)

p75 = lambda x: x.quantile(0.75)
range_agg = lambda x: x.max() - x.min()

for _ in range(WARMUP):
    s.resample("H").agg(p75)
    s.resample("H").agg(range_agg)

t0 = time.perf_counter()
for _ in range(ITERATIONS):
    s.resample("H").agg(p75)
    s.resample("H").agg(range_agg)
elapsed = time.perf_counter() - t0

print(json.dumps({
    "function": "resample_agg_fn",
    "mean_ms": elapsed / ITERATIONS * 1000,
    "iterations": ITERATIONS,
    "total_ms": elapsed * 1000,
}))
