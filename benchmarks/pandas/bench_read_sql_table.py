"""Benchmark: read_sql_table equivalent — read an entire named table into a DataFrame.

Uses an in-memory SQLite database to mirror the tsb readSqlTable benchmark.
`pandas.read_sql_query("SELECT * FROM sensors", con)` is used as the functional
equivalent — both read all rows from a named table via a SQL connection.

Dataset: 10k rows, 3 columns (id int, score float, category str).
Outputs JSON: {"function": "read_sql_table", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import math
import sqlite3
import time

import pandas as pd

ROWS = 10_000
WARMUP = 5
ITERATIONS = 30

# ── Build matching dataset ────────────────────────────────────────────────────
data = {
    "id": list(range(ROWS)),
    "score": [math.sin(i * 0.01) * 100 for i in range(ROWS)],
    "category": [f"cat_{i % 50}" for i in range(ROWS)],
}
df_src = pd.DataFrame(data)

# ── SQLite in-memory database ─────────────────────────────────────────────────
con = sqlite3.connect(":memory:")
df_src.to_sql("sensors", con, index=False, if_exists="replace")

# ── Warm-up ───────────────────────────────────────────────────────────────────
for _ in range(WARMUP):
    pd.read_sql_query("SELECT * FROM sensors", con)

# ── Benchmark ────────────────────────────────────────────────────────────────
start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.read_sql_query("SELECT * FROM sensors", con)
total_ms = (time.perf_counter() - start) * 1000

con.close()

print(json.dumps({
    "function": "read_sql_table",
    "mean_ms": round(total_ms / ITERATIONS, 4),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 4),
}))
