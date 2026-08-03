"""Benchmark: to_markdown / to_latex / Series.to_markdown on a 1000-row DataFrame"""
import json, time, subprocess, sys
try:
    import tabulate  # noqa: F401
except ImportError:
    subprocess.run([sys.executable, "-m", "pip", "install", "tabulate", "--quiet"], check=False)
import numpy as np
import pandas as pd

ROWS = 1_000
WARMUP = 3
ITERATIONS = 20

data = {
    "a": np.arange(ROWS) * 1.1,
    "b": np.sin(np.arange(ROWS)) * 100,
    "c": np.arange(ROWS) % 7,
}
df = pd.DataFrame(data)
s = pd.Series(np.arange(ROWS) * 2.5, name="x")

for _ in range(WARMUP):
    df.to_markdown()
    df.to_latex()
    s.to_markdown()

start = time.perf_counter()
for _ in range(ITERATIONS):
    df.to_markdown()
    df.to_latex()
    s.to_markdown()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "format_table",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
