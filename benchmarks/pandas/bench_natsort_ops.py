"""
Benchmark: natsort.natsorted and natsort.index_natsorted on filename-like strings.
Outputs JSON: {"function": "natsort_ops", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time

SIZE = 10_000
WARMUP = 5
ITERATIONS = 20

filenames = [f"file{i % 100}_chunk{i // 100}.txt" for i in range(SIZE)]

def nat_compare(a, b):
    """Natural comparison: return -1/0/1 by tokenizing digit runs."""
    import re
    def tokenize(s):
        parts = re.split(r'(\d+)', s)
        return [int(p) if p.isdigit() else p for p in parts]
    ta, tb = tokenize(a), tokenize(b)
    return (ta > tb) - (ta < tb)

def nat_sorted(arr):
    import re
    def key(s):
        parts = re.split(r'(\d+)', s)
        return [int(p) if p.isdigit() else p for p in parts]
    return sorted(arr, key=key)

def nat_argsort(arr):
    import re
    def key(s):
        parts = re.split(r'(\d+)', s)
        return [int(p) if p.isdigit() else p for p in parts]
    return [i for i, _ in sorted(enumerate(arr), key=lambda x: key(x[1]))]

for _ in range(WARMUP):
    nat_compare("file10.txt", "file9.txt")
    nat_sorted(filenames)
    nat_argsort(filenames)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    nat_compare("file10.txt", "file9.txt")
    nat_sorted(filenames)
    nat_argsort(filenames)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({
    "function": "natsort_ops",
    "mean_ms": total_ms / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
