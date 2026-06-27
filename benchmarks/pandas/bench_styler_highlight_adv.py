"""Benchmark: Styler advanced — highlight_null / highlight_between / text_gradient /
bar / set_caption / to_latex on 100 rows.

Mirrors tsb Styler: highlightNull / highlightBetween / textGradient / barChart /
setCaption / toLatex.
"""
import json
import time
import warnings
import numpy as np
import pandas as pd

ROWS = 100
WARMUP = 3
ITERATIONS = 20

a_data = np.arange(ROWS, dtype=float)
b_data = np.where(np.arange(ROWS) % 10 == 0, np.nan, np.arange(ROWS) * 2.0)
c_data = np.sin(np.arange(ROWS) / 10) * 50 + 50

df = pd.DataFrame({"a": a_data, "b": b_data, "c": c_data})


def _run():
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        (
            df.style.highlight_null(color="red")
            .highlight_between(left=20, right=80, color="lightyellow")
            .text_gradient(cmap="Blues")
            .bar(align="mid", color="#aec6cf")
            .set_caption("Benchmark Table")
            .to_latex()
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
            "function": "styler_highlight_adv",
            "mean_ms": total_ms / ITERATIONS,
            "iterations": ITERATIONS,
            "total_ms": total_ms,
        }
    )
)
