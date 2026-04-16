"""Benchmark: natural sort using natsort library (equivalent to natSorted/natArgSort)."""
import json, time

SIZE = 10_000
WARMUP = 5
ITERATIONS = 50

data = [f"item{i % 1000}_v{i % 10}" for i in range(SIZE)]

try:
    from natsort import natsorted, index_natsorted
    def run():
        natsorted(data)
        index_natsorted(data)
except ImportError:
    import re
    def nat_key(s):
        return [int(c) if c.isdigit() else c.lower() for c in re.split(r'(\d+)', s)]
    def run():
        sorted(data, key=nat_key)
        sorted(range(len(data)), key=lambda i: nat_key(data[i]))

for _ in range(WARMUP):
    run()

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    run()
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function": "nat_sort", "mean_ms": round(total_ms / ITERATIONS, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
