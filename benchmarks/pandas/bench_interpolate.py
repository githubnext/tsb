import pandas as pd, json, time, numpy as np
rng = np.random.default_rng(42)
arr = rng.standard_normal(100_000).tolist()
for i in range(0, 100_000, 10): arr[i] = None
s = pd.Series(arr, dtype="float64")
for _ in range(3): s.interpolate()
N = 30
t0 = time.perf_counter()
for _ in range(N): s.interpolate()
elapsed = time.perf_counter() - t0
print(json.dumps({"function": "interpolate", "mean_ms": elapsed/N*1000, "iterations": N, "total_ms": elapsed*1000}))
