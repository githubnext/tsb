"""
Benchmark: pandas Series.clip / DataFrame.clip with array/Series bounds.
Outputs JSON: {"function": "clip_with_bounds", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 5
ITERATIONS = 20

data = np.array([(i % 200) - 100 for i in range(ROWS)], dtype=float)
lower_arr = np.full(ROWS, -30.0)
upper_arr = np.full(ROWS, 30.0)
s = pd.Series(data)
lower_s = pd.Series(lower_arr)
upper_s = pd.Series(upper_arr)

df_cols = {f"col{c}": [(i + c * 10) % 200 - 100 for i in range(ROWS)] for c in range(4)}
df = pd.DataFrame(df_cols, dtype=float)
df_lower = pd.Series(np.full(ROWS, -30.0))
df_upper = pd.Series(np.full(ROWS, 30.0))

for _ in range(WARMUP):
    s.clip(lower=lower_s, upper=upper_s)
    df.clip(lower=df_lower, upper=df_upper, axis=0)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.clip(lower=lower_s, upper=upper_s)
    df.clip(lower=df_lower, upper=df_upper, axis=0)
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "clip_with_bounds", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
