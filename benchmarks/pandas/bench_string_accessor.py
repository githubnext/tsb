"""Benchmark: string_accessor — Series.str.split / replace / extract / join on 100k strings"""
import json, time
import pandas as pd

ROWS = 100_000
WARMUP = 3
ITERATIONS = 15

words = ["apple", "banana", "cherry", "date", "elderberry"]
data = [f"{words[i % 5]}-{i % 100}-suffix" for i in range(ROWS)]
s = pd.Series(data)

# pre-split series for join benchmark
split = s.str.split("-")

for _ in range(WARMUP):
    s.str.split("-")
    s.str.replace("suffix", "end", regex=False)
    s.str.extract(r"([a-z]+)-")
    split.str.join("_")

start = time.perf_counter()
for _ in range(ITERATIONS):
    s.str.split("-")
    s.str.replace("suffix", "end", regex=False)
    s.str.extract(r"([a-z]+)-")
    split.str.join("_")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "string_accessor",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
