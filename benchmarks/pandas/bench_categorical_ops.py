"""Benchmark: categorical operations on 100k-element Series

Covers pd.Categorical.from_codes, value_counts (sort by freq), and pd.crosstab.
"""
import json
import time
import numpy as np
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 10

# Build a categorical Series from codes + categories
CATEGORIES = ["alpha", "beta", "gamma", "delta", "epsilon"]
codes = np.arange(ROWS) % len(CATEGORIES)
cat_series = pd.Series(pd.Categorical.from_codes(codes, categories=CATEGORIES))

# Build a second categorical for crosstab
CATEGORIES2 = ["x", "y", "z"]
codes2 = np.arange(ROWS) % len(CATEGORIES2)
cat_series2 = pd.Series(pd.Categorical.from_codes(codes2, categories=CATEGORIES2))

# Warm up
for _ in range(WARMUP):
    cat_series.value_counts()
    cat_series.value_counts(sort=True)
    pd.crosstab(cat_series, cat_series2)

# Measure value_counts (analogous to catFreqTable)
start = time.perf_counter()
for _ in range(ITERATIONS):
    cat_series.value_counts(sort=False)
freq_table_ms = (time.perf_counter() - start) * 1000 / ITERATIONS

# Measure value_counts sorted by freq (analogous to catSortByFreq)
start = time.perf_counter()
for _ in range(ITERATIONS):
    cat_series.value_counts(sort=True)
sort_by_freq_ms = (time.perf_counter() - start) * 1000 / ITERATIONS

# Measure crosstab (analogous to catCrossTab)
start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.crosstab(cat_series, cat_series2)
cross_tab_ms = (time.perf_counter() - start) * 1000 / ITERATIONS

mean_ms = (freq_table_ms + sort_by_freq_ms + cross_tab_ms) / 3

print(json.dumps({
    "function": "categorical_ops",
    "mean_ms": mean_ms,
    "iterations": ITERATIONS,
    "total_ms": mean_ms * ITERATIONS,
    "details": {
        "freqTableMs": freq_table_ms,
        "sortByFreqMs": sort_by_freq_ms,
        "crossTabMs": cross_tab_ms,
    },
}))
