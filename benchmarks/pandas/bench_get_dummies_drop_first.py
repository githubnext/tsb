"""Benchmark: pd.get_dummies with drop_first and prefix options."""
import json, time
import pandas as pd
import numpy as np

ROWS = 50_000
WARMUP = 5
ITERATIONS = 30

cat_data = [f"cat_{i % 10}" for i in range(ROWS)]
s = pd.Categorical(cat_data)
df = pd.DataFrame({
    "category": cat_data,
    "value": np.arange(ROWS, dtype=np.float64) * 0.1,
})

for _ in range(WARMUP):
    pd.get_dummies(s, drop_first=True)
    pd.get_dummies(s, prefix="grp", prefix_sep="_")
    pd.get_dummies(df, columns=["category"], drop_first=True)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    pd.get_dummies(s, drop_first=True)
    pd.get_dummies(s, prefix="grp", prefix_sep="_")
    pd.get_dummies(df, columns=["category"], drop_first=True)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function": "get_dummies_drop_first", "mean_ms": round(total_ms / ITERATIONS, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
