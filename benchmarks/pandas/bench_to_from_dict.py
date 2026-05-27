"""
Benchmark: DataFrame.to_dict / DataFrame.from_dict — dict orient conversions.
Tests: list, records, split, index orient round-trips on a 10k-row DataFrame.
Outputs JSON: {"function": "to_from_dict", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import time
import json
import pandas as pd

SIZE = 10_000
WARMUP = 5
ITERATIONS = 50

df = pd.DataFrame({
    "a": list(range(SIZE)),
    "b": [i * 1.5 for i in range(SIZE)],
    "c": [f"str_{i % 100}" for i in range(SIZE)],
})

small_list = {"a": [1, 2, 3], "b": [4, 5, 6]}
small_df = pd.DataFrame(small_list)
small_index = {0: {"a": 1, "b": 4}, 1: {"a": 2, "b": 5}}

for _ in range(WARMUP):
    df.to_dict(orient="list")
    df.to_dict(orient="records")
    df.to_dict(orient="split")
    df.to_dict(orient="index")
    pd.DataFrame.from_dict(small_list)
    pd.DataFrame.from_dict(small_index, orient="index")

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.to_dict(orient="list")
    df.to_dict(orient="records")
    df.to_dict(orient="split")
    df.to_dict(orient="index")
    pd.DataFrame.from_dict(small_list)
    pd.DataFrame.from_dict(small_index, orient="index")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "to_from_dict",
    "mean_ms": round(total / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total, 3),
}))
