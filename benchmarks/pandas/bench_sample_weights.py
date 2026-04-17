"""
Benchmark: DataFrame.sample / Series.sample with weights option on 100k rows.
Outputs JSON: {"function": "sample_weights", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import math
import time
import pandas as pd
import numpy as np

SIZE = 100_000
WARMUP = 3
ITERATIONS = 20

data = list(range(SIZE))
weights = np.array([math.exp((i / SIZE) * 3) for i in range(SIZE)])
weights_normalized = weights / weights.sum()

s = pd.Series(data)
df = pd.DataFrame({"a": data, "b": [i * 2.0 for i in range(SIZE)], "c": [i * 3.0 for i in range(SIZE)]})

for _ in range(WARMUP):
    s.sample(n=1000, weights=weights_normalized)
    df.sample(n=1000, weights=weights_normalized)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.sample(n=1000, weights=weights_normalized)
    df.sample(n=1000, weights=weights_normalized)
total = (time.perf_counter() - start) * 1000

print(json.dumps({"function": "sample_weights", "mean_ms": total / ITERATIONS, "iterations": ITERATIONS, "total_ms": total}))
