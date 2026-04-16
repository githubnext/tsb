"""Benchmark: DataFrame.pct_change — percentage change across DataFrame columns."""
import json, time
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

df = pd.DataFrame({
    "a": [i * 1.1 + 1 for i in range(SIZE)],
    "b": [i * 0.5 + 2 for i in range(SIZE)],
    "c": [i * 2.3 + 3 for i in range(SIZE)],
})

for _ in range(WARMUP):
    df.pct_change()
    df.pct_change(periods=3)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.pct_change()
    df.pct_change(periods=3)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function": "pctchange_df", "mean_ms": round(total_ms / ITERATIONS, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
