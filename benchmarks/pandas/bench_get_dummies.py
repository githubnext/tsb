"""Benchmark: pd.get_dummies — one-hot encoding of categorical data."""
import json, time
import pandas as pd

SIZE = 10_000
WARMUP = 3
ITERATIONS = 30

categories = ["A", "B", "C", "D", "E"]
s = pd.Series([categories[i % len(categories)] for i in range(SIZE)])
df = pd.DataFrame({
    "cat1": [categories[i % len(categories)] for i in range(SIZE)],
    "cat2": [["x", "y", "z"][i % 3] for i in range(SIZE)],
})

for _ in range(WARMUP):
    pd.get_dummies(s)
    pd.get_dummies(df, columns=["cat1", "cat2"])

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    pd.get_dummies(s)
    pd.get_dummies(df, columns=["cat1", "cat2"])
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function": "get_dummies", "mean_ms": round(total_ms / ITERATIONS, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
