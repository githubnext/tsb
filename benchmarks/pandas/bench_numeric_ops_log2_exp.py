"""
Benchmark: np.log2, np.log10, np.exp, np.sign applied to pandas Series and DataFrame.

Mirrors tsb seriesLog2, seriesLog10, seriesExp, seriesSign and their DataFrame variants.
Uses 100k-row data to match the TypeScript benchmark.
"""
import json
import time
import numpy as np
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 30

# Positive values for log2/log10; any values for exp/sign
data = [(i + 1) * 0.1 for i in range(SIZE)]
s = pd.Series(data, dtype=float)
df = pd.DataFrame({
    "a": [(i + 1) * 0.1 for i in range(SIZE)],
    "b": [(i + 1) * 0.2 for i in range(SIZE)],
})

# Warm-up
for _ in range(WARMUP):
    np.log2(s)
    np.log10(s)
    np.exp(s)
    np.sign(s)
    np.log2(df)
    np.log10(df)
    np.exp(df)
    np.sign(df)

start = time.perf_counter()
for _ in range(ITERATIONS):
    np.log2(s)
    np.log10(s)
    np.exp(s)
    np.sign(s)
    np.log2(df)
    np.log10(df)
    np.exp(df)
    np.sign(df)
total_ms = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "numeric_ops_log2_exp",
    "mean_ms": total_ms / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
