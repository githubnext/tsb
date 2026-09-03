"""
Benchmark: Series.add_prefix / add_suffix / set_axis / DataFrame.set_axis / Series.to_frame
— matching pandas equivalent for bench_series_rename_ops.ts.

Mirrors tsb addPrefixSeries, addSuffixSeries, setAxisSeries, setAxisDataFrame, seriesToFrame.

Outputs JSON: {"function": "series_rename_ops", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd
import numpy as np

SIZE = 100_000
WARMUP = 5
ITERATIONS = 30

data = [i * 0.5 for i in range(SIZE)]
labels = [f"row_{i}" for i in range(SIZE)]
new_labels = [f"new_{i}" for i in range(SIZE)]

s = pd.Series(data, index=labels, name="values")
df = pd.DataFrame({"a": data, "b": [-v for v in data]}, index=labels)

for _ in range(WARMUP):
    s.add_prefix("pre_")
    s.add_suffix("_suf")
    s.set_axis(new_labels)
    df.set_axis(new_labels)
    s.to_frame()
    s.to_frame(name="renamed")

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.add_prefix("pre_")
    s.add_suffix("_suf")
    s.set_axis(new_labels)
    df.set_axis(new_labels)
    s.to_frame()
    s.to_frame(name="renamed")
total = time.perf_counter() - start

total_ms = total * 1000
print(json.dumps({
    "function": "series_rename_ops",
    "mean_ms": total_ms / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
