import pandas as pd, json, time, numpy as np
rng = np.random.default_rng(42)
s = pd.Series(rng.integers(0, 5_000, size=100_000))
for _ in range(3): s.drop_duplicates()
N = 50
t0 = time.perf_counter()
for _ in range(N): s.drop_duplicates()
elapsed = time.perf_counter() - t0
print(json.dumps({"function": "drop_duplicates", "mean_ms": elapsed/N*1000, "iterations": N, "total_ms": elapsed*1000}))
