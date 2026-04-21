"""
Benchmark: pandas pd.Timestamp() — convert ISO strings, timestamps, and datetime objects to Timestamp.
Mirrors tsb bench_to_date_input.ts (toDateInput).
Outputs JSON: {"function": "to_date_input", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
from datetime import datetime
import pandas as pd

WARMUP = 5
ITERATIONS = 50

iso_strings = [
    "2020-01-01",
    "2024-03-15T10:30:00Z",
    "2023-12-31T23:59:59.999Z",
    "2022-07-04",
    "2021-01-01T00:00:00",
]

# millisecond timestamps
timestamps = [
    0,
    1_577_836_800_000,
    1_704_067_200_000,
    1_609_459_200_000,
    1_672_531_200_000,
]

date_objects = [
    datetime(2020, 1, 1),
    datetime(2024, 6, 15),
    datetime(2001, 9, 9, 1, 46, 40),
]

SIZE = 10_000
str_batch = [
    f"{2000 + (i % 25)}-{((i % 12) + 1):02d}-{((i % 28) + 1):02d}"
    for i in range(SIZE)
]
num_batch = [i * 86_400_000 for i in range(SIZE)]

for _ in range(WARMUP):
    for s in iso_strings:
        pd.Timestamp(s)
    for t in timestamps:
        pd.Timestamp(t, unit="ms")
    for d in date_objects:
        pd.Timestamp(d)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    for _ in range(1000):
        for s in iso_strings:
            pd.Timestamp(s)
        for t in timestamps:
            pd.Timestamp(t, unit="ms")
        for d in date_objects:
            pd.Timestamp(d)
    for s in str_batch:
        pd.Timestamp(s)
    for t in num_batch:
        pd.Timestamp(t, unit="ms")
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({
    "function": "to_date_input",
    "mean_ms": round(total_ms / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
