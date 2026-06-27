"""Benchmark: Styler table-level configuration — set_properties / set_table_styles /
set_table_attributes / hide / set_precision / set_na_rep / clear / to_html.

Mirrors tsb Styler: setProperties / setTableStyles / setTableAttributes /
hide / setPrecision / setNaRep / clearStyles / toHtml.
"""
import json
import time
import warnings
import numpy as np
import pandas as pd

ROWS = 100
WARMUP = 3
ITERATIONS = 20

a_data = np.arange(ROWS, dtype=float) * 1.5
b_data = np.where(np.arange(ROWS) % 10 == 0, np.nan, np.arange(ROWS) * 2.0)
c_data = np.sin(np.arange(ROWS) / 10) * 50 + 50

df = pd.DataFrame({"a": a_data, "b": b_data, "c": c_data})


def _run():
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        (
            df.style.set_precision(3)
            .set_na_rep("\u2014")
            .set_properties(subset=["a", "b"], **{"font-size": "12px", "color": "navy"})
            .set_table_styles(
                [
                    {
                        "selector": "th",
                        "props": [("background-color", "#4a90d9"), ("color", "white")],
                    },
                    {
                        "selector": "tr:nth-child(even) td",
                        "props": [("background-color", "#f5f5f5")],
                    },
                ]
            )
            .set_table_attributes('class="data-table" id="bench-table"')
            .hide(axis="index")
            .hide(subset=["c"], axis="columns")
            .clear()
            .to_html()
        )


for _ in range(WARMUP):
    _run()

start = time.perf_counter()
for _ in range(ITERATIONS):
    _run()
total_ms = (time.perf_counter() - start) * 1000

print(
    json.dumps(
        {
            "function": "styler_table_props",
            "mean_ms": total_ms / ITERATIONS,
            "iterations": ITERATIONS,
            "total_ms": total_ms,
        }
    )
)
