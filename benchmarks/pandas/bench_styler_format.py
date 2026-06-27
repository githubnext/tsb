"""Benchmark: Styler.format / apply / applymap / to_html — Styler formatting chain on 100 rows.

Mirrors tsb Styler: format / formatIndex / apply / applymap / toHtml.
"""
import json
import time
import numpy as np
import pandas as pd

ROWS = 100
WARMUP = 3
ITERATIONS = 20


df = pd.DataFrame(
    {
        "a": np.arange(ROWS) * 1.5,
        "b": np.arange(ROWS, 0, -1) * 2.0,
        "c": np.sin(np.arange(ROWS) / 10) * 50 + 50,
    }
)


def _apply_red(vals):
    return ["color: navy"] * len(vals)


def _applymap_bold(v):
    return "font-weight: bold" if isinstance(v, float) and v > 50 else ""


def _run():
    styler = df.style.format("{:.2f}").apply(_apply_red)
    try:
        # pandas 2.1+ renamed applymap → map
        styler = styler.map(_applymap_bold)
    except AttributeError:
        styler = styler.applymap(_applymap_bold)
    styler.to_html()


for _ in range(WARMUP):
    _run()

start = time.perf_counter()
for _ in range(ITERATIONS):
    _run()
total_ms = (time.perf_counter() - start) * 1000

print(
    json.dumps(
        {
            "function": "styler_format",
            "mean_ms": total_ms / ITERATIONS,
            "iterations": ITERATIONS,
            "total_ms": total_ms,
        }
    )
)
