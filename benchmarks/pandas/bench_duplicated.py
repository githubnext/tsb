import pandas as pd, json, time, numpy as np
rng = np.random.default_rng(42)
s = pd.Series(rng.integers(0, 5_000, size=100_000))
for _ in range(3): s.duplicated()
N = 50
t0 = time.perf_counter()
for _ in range(N): s.duplicated()
elapsed = time.perf_counter() - t0
print(json.dumps({"function": "duplicated", "mean_ms": elapsed/N*1000, "iterations": N, "total_ms": elapsed*1000}))
