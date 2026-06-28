"""Benchmark: pd.merge_ordered with left_by grouping — two 3k-row DataFrames, 10 groups."""
import json
import time

import pandas as pd

N = 3_000
GROUPS = 10
PER_GROUP = N // GROUPS
WARMUP = 2
ITERATIONS = 8

grp_left = [f"g{g}" for g in range(GROUPS) for _ in range(PER_GROUP)]
t_left = [j * 2 for _ in range(GROUPS) for j in range(PER_GROUP)]
v1 = [g * PER_GROUP + j for g in range(GROUPS) for j in range(PER_GROUP)]

grp_right = [f"g{g}" for g in range(GROUPS) for _ in range(PER_GROUP)]
t_right = [j * 3 for _ in range(GROUPS) for j in range(PER_GROUP)]
v2 = [g * PER_GROUP + j for g in range(GROUPS) for j in range(PER_GROUP)]

df1 = pd.DataFrame({"grp": grp_left, "t": t_left, "val1": v1})
df2 = pd.DataFrame({"grp": grp_right, "t": t_right, "val2": v2})

for _ in range(WARMUP):
    pd.merge_ordered(df1, df2, on="t", left_by="grp", right_by="grp")

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.merge_ordered(df1, df2, on="t", left_by="grp", right_by="grp")
total = (time.perf_counter() - start) * 1000

print(
    json.dumps(
        {
            "function": "merge_ordered_by",
            "mean_ms": total / ITERATIONS,
            "iterations": ITERATIONS,
            "total_ms": total,
        }
    )
)
