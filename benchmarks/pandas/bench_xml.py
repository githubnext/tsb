"""Benchmark: read_xml / to_xml — parse and serialize XML

Creates a 1,000-row XML document, then benchmarks:
  - pd.read_xml (parse XML string → DataFrame)
  - df.to_xml  (DataFrame → XML string)
"""
import json
import time
import io
import numpy as np
import pandas as pd

ROWS = 1_000
WARMUP = 3
ITERATIONS = 20

# Build XML string with ROWS row elements (matching TS benchmark)
lines = ['<?xml version="1.0"?>', "<data>"]
for i in range(ROWS):
    lines.append(
        f'  <row id="{i}" value="{i * 1.1:.4f}" label="cat_{i % 50}" />'
    )
lines.append("</data>")
xml_string = "\n".join(lines)

# Build a DataFrame for to_xml benchmarks
df = pd.DataFrame(
    {
        "id": np.arange(ROWS, dtype=np.int64),
        "value": np.arange(ROWS, dtype=np.float64) * 1.1,
        "label": [f"cat_{i % 50}" for i in range(ROWS)],
    }
)

# Warm up
for _ in range(WARMUP):
    pd.read_xml(io.StringIO(xml_string))
    df.to_xml()

# Benchmark read_xml
t0 = time.perf_counter()
for _ in range(ITERATIONS):
    pd.read_xml(io.StringIO(xml_string))
read_total = (time.perf_counter() - t0) * 1000

# Benchmark to_xml
t1 = time.perf_counter()
for _ in range(ITERATIONS):
    df.to_xml()
write_total = (time.perf_counter() - t1) * 1000

total = read_total + write_total

print(
    json.dumps(
        {
            "function": "xml",
            "mean_ms": total / (ITERATIONS * 2),
            "iterations": ITERATIONS * 2,
            "total_ms": total,
            "read_mean_ms": read_total / ITERATIONS,
            "write_mean_ms": write_total / ITERATIONS,
        }
    )
)
