"""
Benchmark: DataFrame.var() / DataFrame.sem() — variance and SEM on a 10k×10 DataFrame.
Outputs JSON: {"function": "dataframe_sem_var", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import math
import time
import pandas as pd
import numpy as np

ROWS = 10_000
COLS = 10
WARMUP = 5
ITERATIONS = 20

data = {f"col{c}": np.array([math.sin((i + c) * 0.01) * 100 for i in range(ROWS)]) for c in range(COLS)}
df = pd.DataFrame(data)

for _ in range(WARMUP):
    df.var()
    df.sem()

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.var()
    df.sem()
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "dataframe_sem_var", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
