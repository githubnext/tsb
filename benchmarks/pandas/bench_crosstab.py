import pandas as pd, json, time, numpy as np
rng = np.random.default_rng(42)
a = pd.Series(rng.choice(["A","B","C","D"], size=10_000))
b = pd.Series(rng.choice(["X","Y","Z"], size=10_000))
for _ in range(3): pd.crosstab(a, b)
N = 30
t0 = time.perf_counter()
for _ in range(N): pd.crosstab(a, b)
elapsed = time.perf_counter() - t0
print(json.dumps({"function": "crosstab", "mean_ms": elapsed/N*1000, "iterations": N, "total_ms": elapsed*1000}))
