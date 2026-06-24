"""
Benchmark: pd.Series.dot(DataFrame) and pd.DataFrame.dot(Series) — cross-form dot products.

Mirrors tsb seriesDotDataFrame and dataFrameDotSeries.
Dataset: 1000-element Series, 1000-row × 20-column DataFrame.
Outputs JSON: {"function": "series_dot_dataframe", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

N = 1_000
K = 20
WARMUP = 5
ITERATIONS = 50

s_data = [(i + 1) * 0.01 for i in range(N)]
s = pd.Series(s_data)

cols = {f"c{c}": [(i * K + c) * 0.001 for i in range(N)] for c in range(K)}
df = pd.DataFrame(cols)

for _ in range(WARMUP):
    s.dot(df)
    df.dot(s)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.dot(df)
    df.dot(s)
total_ms = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "series_dot_dataframe",
    "mean_ms": total_ms / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
