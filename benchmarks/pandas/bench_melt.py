import pandas as pd, json, time, numpy as np
rng = np.random.default_rng(42)
df = pd.DataFrame({
    "id": range(10_000),
    "A": rng.standard_normal(10_000),
    "B": rng.standard_normal(10_000),
    "C": rng.standard_normal(10_000),
})
for _ in range(3): df.melt(id_vars=["id"], value_vars=["A","B","C"])
N = 50
t0 = time.perf_counter()
for _ in range(N): df.melt(id_vars=["id"], value_vars=["A","B","C"])
elapsed = time.perf_counter() - t0
print(json.dumps({"function": "melt", "mean_ms": elapsed/N*1000, "iterations": N, "total_ms": elapsed*1000}))
