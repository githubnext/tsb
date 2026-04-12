import pandas as pd, json, time, numpy as np
rng = np.random.default_rng(42)
df = pd.DataFrame(rng.standard_normal((10_000, 5)), columns=list("ABCDE"))
for _ in range(3): df.corr()
N = 50
t0 = time.perf_counter()
for _ in range(N): df.corr()
elapsed = time.perf_counter() - t0
print(json.dumps({"function": "corr", "mean_ms": elapsed/N*1000, "iterations": N, "total_ms": elapsed*1000}))
