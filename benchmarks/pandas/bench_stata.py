"""Benchmark: read_stata / to_stata — Stata .dta file I/O round-trip

Creates a 500-row DataFrame with mixed columns (int, float, string),
then benchmarks:
  - df.to_stata (DataFrame → .dta buffer)
  - pd.read_stata (buffer → DataFrame)
Dataset: 500 rows × 4 columns; 3 warm-up + 20 measured iterations each.
Outputs JSON: {"function": "stata", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import io
import numpy as np
import pandas as pd

ROWS = 500
WARMUP = 3
ITERATIONS = 20

df = pd.DataFrame(
    {
        "id": np.arange(ROWS, dtype=np.int32),
        "value": np.arange(ROWS, dtype=np.float64) * 1.1,
        "score": (np.arange(ROWS) % 100) * 0.5,
        "label": [f"cat_{i % 20}" for i in range(ROWS)],
    }
)


def to_buf(df):
    buf = io.BytesIO()
    df.to_stata(buf, write_index=False)
    buf.seek(0)
    return buf


# Warm up
for _ in range(WARMUP):
    buf = to_buf(df)
    pd.read_stata(buf)

# Benchmark to_stata
t0 = time.perf_counter()
for _ in range(ITERATIONS):
    to_buf(df)
write_total = (time.perf_counter() - t0) * 1000

# Pre-generate buffer for read_stata benchmark
stata_buf = to_buf(df).read()

# Benchmark read_stata
t1 = time.perf_counter()
for _ in range(ITERATIONS):
    pd.read_stata(io.BytesIO(stata_buf))
read_total = (time.perf_counter() - t1) * 1000

total = write_total + read_total

print(
    json.dumps(
        {
            "function": "stata",
            "mean_ms": total / (ITERATIONS * 2),
            "iterations": ITERATIONS * 2,
            "total_ms": total,
            "write_mean_ms": write_total / ITERATIONS,
            "read_mean_ms": read_total / ITERATIONS,
        }
    )
)
