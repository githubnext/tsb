"""Benchmark: pandas api.types checks on mixed values"""
import json, time
import pandas as pd
from pandas.api.types import is_scalar, is_list_like, is_dict_like, is_iterator

ITERATIONS = 100_000
WARMUP = 3
MEASURED = 10

values = [42, "hello", None, [1, 2, 3], {"a": 1}, {1, 2}, {}.items()]

def run_checks():
    for v in values:
        is_scalar(v)
        is_list_like(v)
        is_dict_like(v)
        is_iterator(v)

for _ in range(WARMUP):
    for _ in range(ITERATIONS):
        run_checks()

start = time.perf_counter()
for _ in range(MEASURED):
    for _ in range(ITERATIONS):
        run_checks()
total = (time.perf_counter() - start) * 1000
print(json.dumps({"function": "type_checks", "mean_ms": total / MEASURED, "iterations": MEASURED, "total_ms": total}))
