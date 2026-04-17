"""Benchmark: DataFrame.replace — replace values in a DataFrame."""
import json, time
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

df = pd.DataFrame({
    "a": [i % 10 for i in range(SIZE)],
    "b": [i % 5 for i in range(SIZE)],
    "c": [["x", "y", "z"][i % 3] for i in range(SIZE)],
})
mapping = {0: 100, 1: 200, 2: 300}

for _ in range(WARMUP):
    df.replace(mapping)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.replace(mapping)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function": "replace_dataframe", "mean_ms": round(total_ms / ITERATIONS, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
