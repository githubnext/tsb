import pandas as pd, json, time, numpy as np
rng = np.random.default_rng(42)
s = pd.Series(rng.standard_normal(100_000))
for _ in range(3): pd.qcut(s, q=10, labels=False, duplicates="drop")
N = 30
t0 = time.perf_counter()
for _ in range(N): pd.qcut(s, q=10, labels=False, duplicates="drop")
elapsed = time.perf_counter() - t0
print(json.dumps({"function": "qcut", "mean_ms": elapsed/N*1000, "iterations": N, "total_ms": elapsed*1000}))
