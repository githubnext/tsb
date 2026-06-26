"""Benchmark: DataFrame.itertuples() — iterate over rows as namedtuples."""
import time
import pandas as pd

ROWS = 1_000
WARMUP = 5
ITERATIONS = 50

df = pd.DataFrame({
    "x": [i * 1.5 for i in range(ROWS)],
    "y": [i * 2.5 for i in range(ROWS)],
    "z": [i * 3.5 for i in range(ROWS)],
})

for _ in range(WARMUP):
    for _row in df.itertuples():
        pass

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    for _row in df.itertuples():
        pass
    times.append(time.perf_counter() - t0)

total = sum(times)
mean_ms = (total / ITERATIONS) * 1000
total_ms = total * 1000
print(f'{{"function": "dataframe_itertuples", "mean_ms": {mean_ms:.6f}, "iterations": {ITERATIONS}, "total_ms": {total_ms:.6f}}}')
