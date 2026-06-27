"""Benchmark: join_all — sequential left-join of 4 DataFrames each with 5k rows"""
import json
import time
import pandas as pd

N = 5_000
WARMUP = 3
ITERATIONS = 10

idx = [str(i) for i in range(N)]

base = pd.DataFrame({"a": list(range(N))}, index=idx)
df1 = pd.DataFrame({"b": [i * 2 for i in range(N)]}, index=idx)
df2 = pd.DataFrame({"c": [i * 3 for i in range(N)]}, index=idx)
df3 = pd.DataFrame({"d": [i * 4 for i in range(N)]}, index=idx)

for _ in range(WARMUP):
    base.join([df1, df2, df3])

start = time.perf_counter()
for _ in range(ITERATIONS):
    base.join([df1, df2, df3])
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "join_all",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
