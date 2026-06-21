"""
Benchmark: pandas Series.str.extract() with named capture groups on a 5k-element Series.

Mirrors the tsb strFindallExpand benchmark.
Each string has the form "userN scoreM levelL" and the regex extracts
named groups: word, num, score, level.
"""
import json
import time
import pandas as pd

N = 5_000
WARMUP = 3
ITERATIONS = 20

data = [None if i % 20 == 0 else f"user{i} score{(i * 7) % 100} level{(i % 5) + 1}" for i in range(N)]
s = pd.Series(data, dtype="object")

# Named capture-group pattern matching the TypeScript version
pat = r"(?P<word>[a-z]+)(?P<num>\d+)\s+score(?P<score>\d+)\s+level(?P<level>\d+)"

# Warm-up
for _ in range(WARMUP):
    s.str.extract(pat)

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.str.extract(pat)
total_ms = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "str_findall_expand",
    "mean_ms": total_ms / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
