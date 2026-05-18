"""
Benchmark: pd.read_html — parse HTML tables into DataFrames.
Outputs JSON: {"function": "read_html", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import math

try:
    import pandas as pd
except ImportError:
    import subprocess, sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pandas", "--quiet"])
    import pandas as pd

try:
    import lxml  # noqa: F401
except ImportError:
    import subprocess, sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "lxml", "--quiet"])

ROWS = 1_000
WARMUP = 3
ITERATIONS = 20


def build_html(rows: int) -> str:
    header = "<tr><th>id</th><th>name</th><th>value</th><th>score</th></tr>"
    body_rows = [
        f"<tr><td>{i}</td><td>item_{i % 100}</td><td>{i * 1.5:.2f}</td><td>{math.sin(i * 0.01):.6f}</td></tr>"
        for i in range(rows)
    ]
    return f"<table><thead>{header}</thead><tbody>{''.join(body_rows)}</tbody></table>"


html = build_html(ROWS)

# Warm-up
for _ in range(WARMUP):
    pd.read_html(html)

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.read_html(html)
total_ms = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "read_html",
    "mean_ms": total_ms / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total_ms,
}))
