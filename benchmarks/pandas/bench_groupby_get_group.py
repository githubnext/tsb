"""Benchmark: groupby_get_group — DataFrameGroupBy.get_group on 100k rows"""
import json, time
import pandas as pd
import numpy as np

ROWS = 100_000
WARMUP = 3
ITERATIONS = 20

group_keys = [f"group_{i % 5}" for i in range(ROWS)]
values = list(range(ROWS))
df = pd.DataFrame({"group": group_keys, "value": values})
grouped = df.groupby("group")

for _ in range(WARMUP):
    grouped.get_group("group_0")
    grouped.get_group("group_1")

start = time.perf_counter()
for _ in range(ITERATIONS):
    grouped.get_group("group_0")
    grouped.get_group("group_1")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "groupby_get_group",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
