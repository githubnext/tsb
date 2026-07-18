"""Benchmark: to_excel — write a DataFrame to an XLSX buffer (BytesIO)."""
import json, time, io
import pandas as pd

ROWS = 5_000
WARMUP = 3
ITERATIONS = 20

df = pd.DataFrame({
    "name": [f"name_{i % 1000}" for i in range(ROWS)],
    "value": [i * 1.5 for i in range(ROWS)],
    "flag": [i % 2 == 0 for i in range(ROWS)],
})

for _ in range(WARMUP):
    buf = io.BytesIO()
    df.to_excel(buf, index=True)

times = []
for _ in range(ITERATIONS):
    buf = io.BytesIO()
    t0 = time.perf_counter()
    df.to_excel(buf, index=True)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function": "to_excel", "mean_ms": round(total_ms / ITERATIONS, 3), "iterations": ITERATIONS, "total_ms": round(total_ms, 3)}))
