"""
Benchmark: pandas DataFrame.to_sql — write a DataFrame to a SQL table.

Uses sqlite3 as the in-memory database backend.  `DataFrame.to_sql` serialises
a DataFrame into INSERT statements and writes them through the SQLAlchemy-or-
DBAPI2 connection.  This benchmark measures the serialisation + write path.

Dataset: 10 000-row DataFrame (3 columns: id, value, label).
Outputs JSON: {"function": "to_sql", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import sqlite3
import time

import pandas as pd

ROWS = 10_000
WARMUP = 5
ITERATIONS = 30

ids = list(range(ROWS))
values = [i % 1000 for i in range(ROWS)]
labels = [f"item_{i % 200}" for i in range(ROWS)]

df = pd.DataFrame({"id": ids, "value": values, "label": labels})


def run():
    # Use an in-memory SQLite connection (DBAPI2).
    # `if_exists="replace"` drops and recreates the table each time.
    con = sqlite3.connect(":memory:")
    df.to_sql("sensors", con, if_exists="replace", index=True)
    con.close()


for _ in range(WARMUP):
    run()

start = time.perf_counter()
for _ in range(ITERATIONS):
    run()
total_ms = (time.perf_counter() - start) * 1000

print(
    json.dumps(
        {
            "function": "to_sql",
            "mean_ms": total_ms / ITERATIONS,
            "iterations": ITERATIONS,
            "total_ms": total_ms,
        }
    )
)
