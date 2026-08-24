"""
Benchmark: pandas read_sql — auto-dispatching SQL read (query vs table).

Uses sqlite3 as the database backend. The `pd.read_sql` function inspects
the first argument and dispatches to `read_sql_query` or `read_sql_table`
automatically — mirroring tsb's `readSql`.

Dataset: 10 000-row in-memory SQLite table (3 columns).
Outputs JSON: {"function": "read_sql", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import sqlite3
import time

import pandas as pd

ROWS = 10_000
WARMUP = 5
ITERATIONS = 30

# Build an in-memory SQLite database with the same dataset.
con = sqlite3.connect(":memory:")
con.execute(
    "CREATE TABLE sensors (id INTEGER, value INTEGER, label TEXT)"
)
con.executemany(
    "INSERT INTO sensors VALUES (?, ?, ?)",
    [(i, i % 1000, f"item_{i % 200}") for i in range(ROWS)],
)
con.commit()

SQL_QUERY = "SELECT * FROM sensors"
TABLE_NAME = "sensors"


def run():
    # Query dispatch path
    df1 = pd.read_sql(SQL_QUERY, con)
    # Table dispatch path
    df2 = pd.read_sql(TABLE_NAME, con)
    _ = df1.shape
    _ = df2.shape


for _ in range(WARMUP):
    run()

start = time.perf_counter()
for _ in range(ITERATIONS):
    run()
total_ms = (time.perf_counter() - start) * 1000

con.close()

print(
    json.dumps(
        {
            "function": "read_sql",
            "mean_ms": total_ms / ITERATIONS,
            "iterations": ITERATIONS,
            "total_ms": total_ms,
        }
    )
)
