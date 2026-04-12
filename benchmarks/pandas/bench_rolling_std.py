import pandas as pd, json, time, numpy as np
rng = np.random.default_rng(42)
s = pd.Series(rng.standard_normal(100_000))
for _ in range(3): s.rolling(window=20).std()
N = 50
t0 = time.perf_counter()
for _ in range(N): s.rolling(window=20).std()
elapsed = time.perf_counter() - t0
print(json.dumps({"function": "rolling_std", "mean_ms": elapsed/N*1000, "iterations": N, "total_ms": elapsed*1000}))
