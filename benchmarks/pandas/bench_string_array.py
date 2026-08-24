"""Benchmark: StringArray — nullable string extension array operations.
N=100_000 elements with ~10% nulls using pandas StringDtype.
Tests: from_sequence, upper, lower, strip, contains, len, fillna.
"""
import json
import time
import pandas as pd

N = 100_000
WARMUP = 3
ITERATIONS = 50

WORDS = ["hello", "world", "  foo  ", "bar", "baz", "  qux  ", "quux", "corge", "grault", "garply"]

raw = [(None if i % 10 == 0 else WORDS[i % len(WORDS)]) for i in range(N)]


def run():
    a = pd.array(raw, dtype="string")
    _ = a.str.upper()
    _ = a.str.lower()
    _ = a.str.strip()
    _ = a.str.contains("oo", na=False)
    _ = a.str.len()
    _ = a.fillna("NA")


for _ in range(WARMUP):
    run()

start = time.perf_counter()
for _ in range(ITERATIONS):
    run()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "string_array",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
