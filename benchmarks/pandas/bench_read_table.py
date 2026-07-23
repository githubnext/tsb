"""Benchmark: read_table — parse a 100k-row tab-separated file"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 2
ITERATIONS = 5

# Build TSV file
tmp_path = "/tmp/gh-aw/agent/bench_read_table.tsv"
with open(tmp_path, "w") as f:
    f.write("id\tvalue\tlabel\n")
    for i in range(ROWS):
        f.write(f"{i}\t{i * 1.1:.4f}\tcat_{i % 50}\n")

for _ in range(WARMUP):
    pd.read_table(tmp_path)

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.read_table(tmp_path)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "read_table",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
