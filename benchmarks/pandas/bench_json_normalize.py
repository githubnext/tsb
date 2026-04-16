"""Benchmark: json_normalize — flatten nested JSON to a flat DataFrame."""
import json, time
import pandas as pd

SIZE = 1_000
WARMUP = 5
ITERATIONS = 50

records = [
    {"id": i, "name": f"user_{i}", "address": {"city": f"city_{i % 10}", "zip": str(10000 + i)}, "scores": [i, i+1, i+2]}
    for i in range(SIZE)
]

for _ in range(WARMUP):
    pd.json_normalize(records, max_level=2)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    pd.json_normalize(records, max_level=2)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function":"json_normalize","mean_ms":round(total_ms/ITERATIONS,3),"iterations":ITERATIONS,"total_ms":round(total_ms,3)}))
