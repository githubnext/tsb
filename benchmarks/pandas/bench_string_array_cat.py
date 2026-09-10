"""
Benchmark: Series.str.cat() — element-wise string concatenation with separator.
N=100_000 nullable strings (~10% nulls) in each of two string Series;
str.cat() joins them pairwise with a separator character.

Mirrors bench_string_array_cat.ts (tsb StringArray.cat("-", other)).

Outputs JSON: {"function": "string_array_cat", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""

import json
import time

import pandas as pd
import numpy as np

N = 100_000
WARMUP = 3
ITERATIONS = 50

WORDS_A = ["hello", "world", "foo", "bar", "baz", "qux", "quux", "corge", "grault", "garply"]
WORDS_B = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta", "iota", "kappa"]

raw_a = [None if i % 10 == 0 else WORDS_A[i % len(WORDS_A)] for i in range(N)]
raw_b = [None if i % 7 == 0 else WORDS_B[i % len(WORDS_B)] for i in range(N)]

s_a = pd.Series(raw_a, dtype="string")
s_b = pd.Series(raw_b, dtype="string")


def run() -> None:
    s_a.str.cat(s_b, sep="-", na_rep=None)


for _ in range(WARMUP):
    run()

t0 = time.perf_counter()
for _ in range(ITERATIONS):
    run()
total_s = time.perf_counter() - t0
total_ms = total_s * 1000

print(json.dumps({
    "function": "string_array_cat",
    "mean_ms": total_ms / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
