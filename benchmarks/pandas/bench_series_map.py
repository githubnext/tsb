import pandas as pd, json, time, numpy as np
rng = np.random.default_rng(42)
s = pd.Series(rng.integers(0, 1_000, size=100_000))
mapping = {i: i * 2 for i in range(1_000)}
for _ in range(3): s.map(mapping)
N = 30
t0 = time.perf_counter()
for _ in range(N): s.map(mapping)
elapsed = time.perf_counter() - t0
print(json.dumps({"function": "series_map", "mean_ms": elapsed/N*1000, "iterations": N, "total_ms": elapsed*1000}))
