import pandas as pd, json, time, numpy as np
rng = np.random.default_rng(42)
s = pd.Series(rng.standard_normal(100_000))
bins = [-4, -2, -1, 0, 1, 2, 4]
for _ in range(3): pd.cut(s, bins=bins, labels=False)
N = 50
t0 = time.perf_counter()
for _ in range(N): pd.cut(s, bins=bins, labels=False)
elapsed = time.perf_counter() - t0
print(json.dumps({"function": "cut", "mean_ms": elapsed/N*1000, "iterations": N, "total_ms": elapsed*1000}))
