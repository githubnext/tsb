"""Benchmark: numpy.searchsorted (scalar) / numpy.searchsorted (array) / numpy.argsort
— mirrors tsb searchsortedAccelerated / searchsortedManyAccelerated / argsortScalarsAccelerated.
"""
import json
import time
import numpy as np

SIZE = 100_000
WARMUP = 3
ITERATIONS = 20

arr = np.sin(np.arange(SIZE) * 0.001) * SIZE
sorted_arr = np.sort(arr)
queries = (np.arange(1_000) - 500) * (SIZE / 500)

for _ in range(WARMUP):
    np.searchsorted(sorted_arr, queries[0])
    np.searchsorted(sorted_arr, queries)
    np.argsort(arr)

start = time.perf_counter()
for _ in range(ITERATIONS):
    np.searchsorted(sorted_arr, queries[0])
    np.searchsorted(sorted_arr, queries)
    np.argsort(arr)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "wasm_accelerated",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
