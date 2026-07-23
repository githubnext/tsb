"""Benchmark: read_sql / to_sql on 10k-row DataFrames using SQLite in-memory"""
import json
import time
import math
import sqlite3
import pandas as pd

ROWS = 10_000
WARMUP = 3
ITERATIONS = 20

# ── Build a matching dataset ──────────────────────────────────────────────────
data = {
    "id": list(range(ROWS)),
    "value": [math.sin(i * 0.01) * 1000 for i in range(ROWS)],
    "label": [f"item_{i % 100}" for i in range(ROWS)],
}
df = pd.DataFrame(data)

# ── SQLite in-memory database ─────────────────────────────────────────────────
con = sqlite3.connect(":memory:")
df.to_sql("mock_table", con, index=False, if_exists="replace")

# ── Warm-up reads ─────────────────────────────────────────────────────────────
for _ in range(WARMUP):
    pd.read_sql_query("SELECT * FROM mock_table", con)

# ── read_sql_query benchmark ──────────────────────────────────────────────────
start_read = time.perf_counter()
for _ in range(ITERATIONS):
    pd.read_sql_query("SELECT * FROM mock_table", con)
total_read = (time.perf_counter() - start_read) * 1000

# ── Warm-up writes ────────────────────────────────────────────────────────────
for _ in range(WARMUP):
    df.to_sql("bench_table", con, index=False, if_exists="replace")

# ── to_sql benchmark ──────────────────────────────────────────────────────────
start_write = time.perf_counter()
for _ in range(ITERATIONS):
    df.to_sql("bench_table", con, index=False, if_exists="replace")
total_write = (time.perf_counter() - start_write) * 1000

con.close()

print(json.dumps({
    "function": "sql",
    "mean_ms": (total_read + total_write) / (2 * ITERATIONS),
    "iterations": ITERATIONS,
    "total_ms": total_read + total_write,
    "read_mean_ms": total_read / ITERATIONS,
    "write_mean_ms": total_write / ITERATIONS,
}))
