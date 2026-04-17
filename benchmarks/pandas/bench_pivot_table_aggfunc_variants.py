"""
Benchmark: pd.pivot_table with multiple aggfuncs (sum, count, min, max) on 50k-row DataFrame.
Outputs JSON: {"function": "pivot_table_aggfunc_variants", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

ROWS = 50_000
WARMUP = 3
ITERATIONS = 20

regions = ["North", "South", "East", "West"]
categories = ["A", "B", "C", "D", "E"]

df = pd.DataFrame({
    "region": [regions[i % len(regions)] for i in range(ROWS)],
    "category": [categories[i % len(categories)] for i in range(ROWS)],
    "sales": [(i % 1000) * 1.5 + 10 for i in range(ROWS)],
})

for _ in range(WARMUP):
    pd.pivot_table(df, values="sales", index="region", columns="category", aggfunc="sum")
    pd.pivot_table(df, values="sales", index="region", columns="category", aggfunc="count")
    pd.pivot_table(df, values="sales", index="region", columns="category", aggfunc="min")
    pd.pivot_table(df, values="sales", index="region", columns="category", aggfunc="max")

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.pivot_table(df, values="sales", index="region", columns="category", aggfunc="sum")
    pd.pivot_table(df, values="sales", index="region", columns="category", aggfunc="count")
    pd.pivot_table(df, values="sales", index="region", columns="category", aggfunc="min")
    pd.pivot_table(df, values="sales", index="region", columns="category", aggfunc="max")
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "pivot_table_aggfunc_variants", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
