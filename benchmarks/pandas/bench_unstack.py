import pandas as pd, json, time, numpy as np
rng = np.random.default_rng(42)
idx = pd.MultiIndex.from_product([range(1000), range(20)], names=["row", "col"])
s = pd.Series(rng.standard_normal(20_000), index=idx)
for _ in range(3): s.unstack()
N = 100
t0 = time.perf_counter()
for _ in range(N): s.unstack()
elapsed = time.perf_counter() - t0
print(json.dumps({"function": "unstack", "mean_ms": elapsed/N*1000, "iterations": N, "total_ms": elapsed*1000}))
