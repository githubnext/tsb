"""Benchmark: pandas.read_fwf — read fixed-width formatted text into a DataFrame."""
import json
import time
import io
import pandas as pd

WARMUP = 5
ITERATIONS = 50

def build_fwf(rows: int) -> str:
    """Build a fixed-width text matching the TypeScript benchmark."""
    header = "id    name        age score   city        "
    names = ["Alice ", "Bob   ", "Carol ", "Dave  ", "Eve   "]
    cities = ["NYC      ", "LA       ", "Chicago  ", "Houston  ", "Seattle  "]
    lines = [header]
    for i in range(rows):
        id_col = str(i + 1).rjust(5) + " "
        name_col = names[i % 5].ljust(12)
        age_col = str(20 + (i % 50)).rjust(3) + " "
        score_col = str(round((i % 100) / 10, 1)).ljust(8)
        city_col = cities[i % 5].ljust(12)
        lines.append(id_col + name_col + age_col + score_col + city_col)
    return "\n".join(lines)

fwf_text = build_fwf(1000)
colspecs = [(0, 6), (6, 18), (18, 22), (22, 30), (30, 42)]

# Warm-up
for _ in range(WARMUP):
    pd.read_fwf(io.StringIO(fwf_text))
    pd.read_fwf(io.StringIO(fwf_text), colspecs=colspecs)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()

    # Auto-infer column widths
    pd.read_fwf(io.StringIO(fwf_text))
    # Explicit colspecs
    pd.read_fwf(io.StringIO(fwf_text), colspecs=colspecs)

    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({
    "function": "fwf",
    "mean_ms": round(total_ms / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
