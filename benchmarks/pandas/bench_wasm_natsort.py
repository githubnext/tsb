"""Benchmark: natsort — natSorted / natArgSort / natCompare on 10k strings.

Mirrors tsb natCompareAccelerated / natSortedAccelerated / natArgSortAccelerated.
Falls back to a simple key if natsort package is not installed.
Outputs JSON: {"function": "wasm_natsort", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import random

try:
    from natsort import natsorted, natsort_keygen
    _HAS_NATSORT = True
except ImportError:
    _HAS_NATSORT = False

random.seed(42)
N = 10_000
WARMUP = 3
ITERATIONS = 20

arr = [f"file{random.randint(0, N)}_v{i % 100}.txt" for i in range(N)]

if _HAS_NATSORT:
    key_fn = natsort_keygen()

    def run():
        _ = natsorted(arr)
        _ = natsorted(range(len(arr)), key=lambda i: key_fn(arr[i]))
        # natCompare equivalent: compare two strings
        a, b = "file10.txt", "file9.txt"
        _ = (key_fn(a) > key_fn(b)) - (key_fn(a) < key_fn(b))
else:
    import re

    def _nat_key(s):
        return [int(c) if c.isdigit() else c.lower() for c in re.split(r"(\d+)", s)]

    def run():
        _ = sorted(arr, key=_nat_key)
        _ = sorted(range(len(arr)), key=lambda i: _nat_key(arr[i]))
        a, b = "file10.txt", "file9.txt"
        ka, kb = _nat_key(a), _nat_key(b)
        _ = (ka > kb) - (ka < kb)


for _ in range(WARMUP):
    run()

start = time.perf_counter()
for _ in range(ITERATIONS):
    run()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "wasm_natsort",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
