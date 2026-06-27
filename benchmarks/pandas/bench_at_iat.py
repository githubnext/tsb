"""Benchmark: Series.at, Series.iat, DataFrame.at, DataFrame.iat — fast scalar access"""
import json
import time
import pandas as pd

N = 100_000
WARMUP = 3
ITERATIONS = 10

labels = [f"r{i}" for i in range(N)]
values = [i * 1.5 for i in range(N)]

s = pd.Series(values, index=labels)
df = pd.DataFrame({"a": values, "b": [v * 2 for v in values]}, index=labels)

mid_label = f"r{N // 2}"

for _ in range(WARMUP):
    _ = s.at[mid_label]
    _ = s.iat[N // 2]
    _ = df.at[mid_label, "a"]
    _ = df.iat[N // 2, 0]

start = time.perf_counter()
for _ in range(ITERATIONS):
    _ = s.at[mid_label]
    _ = s.iat[N // 2]
    _ = df.at[mid_label, "a"]
    _ = df.iat[N // 2, 0]
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "at_iat",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
