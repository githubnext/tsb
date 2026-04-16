"""Benchmark: DataFrame.select_dtypes — filter columns by dtype."""
import json, time
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

df = pd.DataFrame({
    "a": list(range(SIZE)),
    "b": [i * 1.5 for i in range(SIZE)],
    "c": [f"str{i % 1000}" for i in range(SIZE)],
    "d": [i % 2 == 0 for i in range(SIZE)],
    "e": list(range(0, SIZE * 2, 2)),
    "f": [f"label{i % 100}" for i in range(SIZE)],
})

for _ in range(WARMUP):
    df.select_dtypes(include=["number"])
    df.select_dtypes(include=["object"])
    df.select_dtypes(exclude=["bool"])

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.select_dtypes(include=["number"])
    df.select_dtypes(include=["object"])
    df.select_dtypes(exclude=["bool"])
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function": "select_dtypes", "mean_ms": round(total_ms / ITERATIONS, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
