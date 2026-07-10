"""Benchmark: pd.testing.assert_series_equal / assert_frame_equal / assert_index_equal."""
import json, time
import numpy as np
import pandas as pd

SIZE = 10_000
WARMUP = 5
ITERATIONS = 100

numeric_data = np.arange(SIZE, dtype=float) * 0.1
string_data = [f"item_{i % 200}" for i in range(SIZE)]
bool_data = np.arange(SIZE) % 2 == 0

s1 = pd.Series(numeric_data)
s2 = pd.Series(numeric_data.copy())
s_str1 = pd.Series(string_data)
s_str2 = pd.Series(string_data.copy())

df1 = pd.DataFrame({"a": numeric_data, "b": string_data, "c": bool_data})
df2 = pd.DataFrame({"a": numeric_data.copy(), "b": string_data.copy(), "c": bool_data.copy()})

idx1 = pd.Index(np.arange(SIZE))
idx2 = pd.Index(np.arange(SIZE))

for _ in range(WARMUP):
    pd.testing.assert_series_equal(s1, s2)
    pd.testing.assert_series_equal(s_str1, s_str2)
    pd.testing.assert_frame_equal(df1, df2)
    pd.testing.assert_index_equal(idx1, idx2)

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.testing.assert_series_equal(s1, s2)
    pd.testing.assert_series_equal(s_str1, s_str2)
    pd.testing.assert_frame_equal(df1, df2)
    pd.testing.assert_index_equal(idx1, idx2)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "assert_equal",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
