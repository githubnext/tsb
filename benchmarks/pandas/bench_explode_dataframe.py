"""Benchmark: DataFrame.explode() — explode list-column into rows."""
import json, time
import pandas as pd

ROWS = 10_000
WARMUP = 5
ITERATIONS = 30

vals = [[i, i + 1, i + 2] for i in range(ROWS)]
labels = [f"cat_{i % 100}" for i in range(ROWS)]
df = pd.DataFrame({"vals": vals, "labels": labels})

for _ in range(WARMUP):
    df.explode("vals")

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.explode("vals")
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function": "explode_dataframe", "mean_ms": round(total_ms / ITERATIONS, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
