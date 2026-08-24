"""
Benchmark: read_hdf / to_hdf — HDF5 round-trip on 5k rows.
DataFrame with int, float, and string columns.
"""
import json
import time
import tempfile
import os
import pandas as pd
import numpy as np

ROWS = 5_000
WARMUP = 3
ITERATIONS = 20

rng = np.random.default_rng(42)
df = pd.DataFrame({
    "id": np.arange(ROWS, dtype=np.int64),
    "value": np.arange(ROWS, dtype=np.float64) * 1.1,
    "label": [f"cat_{i % 50}" for i in range(ROWS)],
})

def run_hdf_roundtrip(path: str) -> None:
    df.to_hdf(path, key="df", mode="w")
    pd.read_hdf(path, key="df")

# Use a temp file since pandas to_hdf requires a file path (not BytesIO for HDF5)
with tempfile.NamedTemporaryFile(suffix=".h5", delete=False) as f:
    tmp_path = f.name

try:
    # Warm up
    for _ in range(WARMUP):
        run_hdf_roundtrip(tmp_path)

    # Measure round-trip
    start = time.perf_counter()
    for _ in range(ITERATIONS):
        run_hdf_roundtrip(tmp_path)
    total = (time.perf_counter() - start) * 1000
finally:
    os.unlink(tmp_path)

print(json.dumps({
    "function": "hdf",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
