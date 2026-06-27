"""Benchmark: cut_bins_to_frame — pd.cut with value_counts and bin summary on 100k rows."""
import json, time
import numpy as np
import pandas as pd

SIZE = 100_000
NUM_BINS = 20
WARMUP = 5
ITERATIONS = 50

data = np.array([(i % 1000) * 0.1 for i in range(SIZE)])

for _ in range(WARMUP):
    # pandas equivalent of cutBinsToFrame: cut + value_counts on the categorical result
    cut_result = pd.cut(data, NUM_BINS)
    # Summary DataFrame equivalent to cutBinsToFrame
    counts = cut_result.value_counts(sort=False)
    summary = pd.DataFrame({
        "bin": counts.index.astype(str),
        "left": [iv.left for iv in counts.index],
        "right": [iv.right for iv in counts.index],
        "count": counts.values,
        "frequency": counts.values / len(data),
    })
    # cutBinCounts equivalent: counts dict
    count_dict = dict(zip(counts.index.astype(str), counts.values))
    # binEdges equivalent: DataFrame of interval edges
    edges = pd.DataFrame({
        "left": [iv.left for iv in counts.index],
        "right": [iv.right for iv in counts.index],
    })

start = time.perf_counter()
for _ in range(ITERATIONS):
    cut_result = pd.cut(data, NUM_BINS)
    counts = cut_result.value_counts(sort=False)
    summary = pd.DataFrame({
        "bin": counts.index.astype(str),
        "left": [iv.left for iv in counts.index],
        "right": [iv.right for iv in counts.index],
        "count": counts.values,
        "frequency": counts.values / len(data),
    })
    count_dict = dict(zip(counts.index.astype(str), counts.values))
    edges = pd.DataFrame({
        "left": [iv.left for iv in counts.index],
        "right": [iv.right for iv in counts.index],
    })
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "cut_bins_to_frame",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
