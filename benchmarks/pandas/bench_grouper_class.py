"""Benchmark: pd.Grouper construction and isinstance checks — 50k iterations."""
import json
import time

import pandas as pd

WARMUP = 5
ITERATIONS = 50_000


def run_groupers() -> None:
    g1 = pd.Grouper(key="col_a")
    g2 = pd.Grouper(key="date", sort=True)
    g3 = pd.Grouper(key="category", dropna=False)

    isinstance(g1, pd.Grouper)
    isinstance(g2, pd.Grouper)
    isinstance(g3, pd.Grouper)
    isinstance("not_a_grouper", pd.Grouper)
    isinstance(42, pd.Grouper)

    str(g1)
    str(g2)
    str(g3)


for _ in range(WARMUP):
    run_groupers()

start = time.perf_counter()
for _ in range(ITERATIONS):
    run_groupers()
total = (time.perf_counter() - start) * 1000

print(
    json.dumps(
        {
            "function": "grouper_class",
            "mean_ms": total / ITERATIONS,
            "iterations": ITERATIONS,
            "total_ms": total,
        }
    )
)
