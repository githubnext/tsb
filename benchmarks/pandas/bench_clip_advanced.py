"""
Benchmark: Series.clip(lower_arr, upper_arr) / DataFrame.clip() — per-element clipping with array bounds.
Outputs JSON: {"function": "clip_advanced", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import math
import time
import pandas as pd
import numpy as np

ROWS = 50_000
WARMUP = 5
ITERATIONS = 30

data = np.array([math.sin(i * 0.01) * 200 for i in range(ROWS)])
lower = np.full(ROWS, -50.0)
upper = np.full(ROWS, 50.0)
s = pd.Series(data)

df_data = {f"col{c}": np.array([math.sin((i + c) * 0.01) * 200 for i in range(ROWS)]) for c in range(5)}
df = pd.DataFrame(df_data)

for _ in range(WARMUP):
    s.clip(lower=lower, upper=upper)
    df.clip(lower=-50, upper=50)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.clip(lower=lower, upper=upper)
    df.clip(lower=-50, upper=50)
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "clip_advanced", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
