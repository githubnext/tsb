"""
Benchmark: StringArray additional string operations —
lstrip, rstrip, startswith, endswith, replace, zfill
on a 100k-element nullable StringDtype array (~10 % nulls).

Mirrors pandas pd.array([...], dtype="string") str methods:
  str.lstrip, str.rstrip, str.startswith, str.endswith, str.replace, str.zfill

Outputs JSON: {"function": "string_array_str_ops", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import pandas as pd

N = 100_000
WARMUP = 3
ITERATIONS = 50

WORDS = ["  hello world  ", "  foo bar  ", "baz qux  ", "  quux", "corge", "grault  ", "garply"]
raw = [None if i % 10 == 0 else WORDS[i % len(WORDS)] for i in range(N)]

a = pd.array(raw, dtype="string")


def run() -> None:
    a.str.lstrip()
    a.str.rstrip()
    a.str.startswith("  he")
    a.str.endswith("ld  ")
    a.str.replace("hello", "hi", regex=False)
    a.str.zfill(12)


for _ in range(WARMUP):
    run()

start = time.perf_counter()
for _ in range(ITERATIONS):
    run()
total_ms = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "string_array_str_ops",
    "mean_ms": total_ms / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
