"""Benchmark: pd.wide_to_long with sep and suffix options."""
import json, time
import pandas as pd

ROWS = 5_000
WARMUP = 3
ITERATIONS = 20

ids = list(range(ROWS))
df1 = pd.DataFrame({
    "id": ids,
    "A_1": [i * 1.0 for i in ids],
    "A_2": [i * 1.1 for i in ids],
    "A_3": [i * 1.2 for i in ids],
    "B_1": [i * 2.0 for i in ids],
    "B_2": [i * 2.1 for i in ids],
    "B_3": [i * 2.2 for i in ids],
})

students = [f"s{i}" for i in ids]
df2 = pd.DataFrame({
    "student": students,
    "score_Q1": [i + 10 for i in ids],
    "score_Q2": [i + 20 for i in ids],
    "score_Q3": [i + 30 for i in ids],
})

for _ in range(WARMUP):
    pd.wide_to_long(df1, stubnames=["A", "B"], i="id", j="period", sep="_")
    pd.wide_to_long(df2, stubnames="score", i="student", j="quarter", sep="_", suffix=r"Q\d+")

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.wide_to_long(df1, stubnames=["A", "B"], i="id", j="period", sep="_")
    pd.wide_to_long(df2, stubnames="score", i="student", j="quarter", sep="_", suffix=r"Q\d+")
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "wide_to_long_sep_suffix",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
