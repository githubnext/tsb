"""Benchmark: numpy.sum / numpy.mean / numpy.min / numpy.max / numpy.var(ddof=1) /
numpy.std(ddof=1) / numpy.median — mirrors tsb sumF64Accelerated / meanF64Accelerated /
minF64Accelerated / maxF64Accelerated / varF64Accelerated / stdF64Accelerated /
medianF64Accelerated.
"""
import json
import time
import numpy as np

SIZE = 100_000
WARMUP = 3
ITERATIONS = 20

arr = np.sin(np.arange(SIZE) * 0.001) * SIZE


def run_once():
    np.sum(arr)
    np.mean(arr)
    np.min(arr)
    np.max(arr)
    np.var(arr, ddof=1)
    np.std(arr, ddof=1)
    np.median(arr)


for _ in range(WARMUP):
    run_once()

start = time.perf_counter()
for _ in range(ITERATIONS):
    run_once()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "wasm_agg_scalar",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
