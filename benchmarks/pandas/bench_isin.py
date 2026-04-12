import pandas as pd, json, time, numpy as np
rng = np.random.default_rng(42)
s = pd.Series(rng.integers(0, 10_000, size=100_000))
test_set = list(range(0, 10_000, 4))
for _ in range(3): s.isin(test_set)
N = 50
t0 = time.perf_counter()
for _ in range(N): s.isin(test_set)
elapsed = time.perf_counter() - t0
print(json.dumps({"function": "isin", "mean_ms": elapsed/N*1000, "iterations": N, "total_ms": elapsed*1000}))
