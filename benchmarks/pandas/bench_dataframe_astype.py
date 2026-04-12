import pandas as pd, json, time, numpy as np
rng = np.random.default_rng(42)
df = pd.DataFrame({"a": rng.standard_normal(100_000), "b": rng.integers(0, 1000, size=100_000)})
for _ in range(3): df.astype({"a": "float32", "b": "int32"})
N = 100
t0 = time.perf_counter()
for _ in range(N): df.astype({"a": "float32", "b": "int32"})
elapsed = time.perf_counter() - t0
print(json.dumps({"function": "dataframe_astype", "mean_ms": elapsed/N*1000, "iterations": N, "total_ms": elapsed*1000}))
