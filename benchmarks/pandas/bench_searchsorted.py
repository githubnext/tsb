"""Benchmark: searchsorted / searchsortedMany — binary search on sorted arrays."""
import json, time
import numpy as np

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

sorted_arr = np.array([i * 2 for i in range(SIZE)])
needles = np.array([i * 200 for i in range(1_000)])

for _ in range(WARMUP):
    np.searchsorted(sorted_arr, 50_000)
    np.searchsorted(sorted_arr, needles)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    np.searchsorted(sorted_arr, 50_000)
    np.searchsorted(sorted_arr, needles)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function":"searchsorted","mean_ms":round(total_ms/ITERATIONS,3),"iterations":ITERATIONS,"total_ms":round(total_ms,3)}))
