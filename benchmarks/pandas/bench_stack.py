import pandas as pd, json, time, numpy as np
rng = np.random.default_rng(42)
df = pd.DataFrame(rng.standard_normal((1000, 20)), columns=[f"c{i}" for i in range(20)])
for _ in range(3): df.stack()
N = 100
t0 = time.perf_counter()
for _ in range(N): df.stack()
elapsed = time.perf_counter() - t0
print(json.dumps({"function": "stack", "mean_ms": elapsed/N*1000, "iterations": N, "total_ms": elapsed*1000}))
