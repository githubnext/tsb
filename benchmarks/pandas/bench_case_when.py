"""Benchmark: case_when — conditional value selection on 100k-element Series (pandas 2.2+)"""
import json, time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 5
ITERATIONS = 20

data = np.arange(ROWS, dtype=float) % 100
s = pd.Series(data)
cond1 = s < 25
cond2 = s < 50
cond3 = s < 75

caselist = [
    (cond1, "low"),
    (cond2, "medium-low"),
    (cond3, "medium-high"),
]

for _ in range(WARMUP):
    s.case_when(caselist)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.case_when(caselist)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "case_when",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
