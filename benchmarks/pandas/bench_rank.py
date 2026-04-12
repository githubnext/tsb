import pandas as pd, json, time, numpy as np
rng = np.random.default_rng(42)
s = pd.Series(rng.integers(0, 1000, size=100_000))
# warm-up
for _ in range(3): s.rank(method="average")
N = 50
t0 = time.perf_counter()
for _ in range(N): s.rank(method="average")
elapsed = time.perf_counter() - t0
print(json.dumps({"function": "rank", "mean_ms": elapsed/N*1000, "iterations": N, "total_ms": elapsed*1000}))
