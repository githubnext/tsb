"""Benchmark: read_hdf / to_hdf — HDF5 round-trip on a 10k-row DataFrame"""
import json, time, io
import numpy as np
import pandas as pd

ROWS = 10_000
WARMUP = 3
ITERATIONS = 20

rng = np.arange(ROWS)
df = pd.DataFrame({
    "id": rng,
    "value": rng * 1.23456,
    "flag": rng % 2,
})

tmp_path = "/tmp/gh-aw/agent/bench_readHdf.h5"

def roundtrip():
    df.to_hdf(tmp_path, key="df", mode="w")
    pd.read_hdf(tmp_path, key="df")

for _ in range(WARMUP):
    roundtrip()

start = time.perf_counter()
for _ in range(ITERATIONS):
    roundtrip()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "readHdf",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
