"""Benchmark: formatter factory functions — make formatters and apply to series/dataframe.
Mirrors tsb bench_formatter_factories_fn.ts using pandas styling/format.
"""
import json, time
import pandas as pd
import numpy as np

SIZE = 10_000
WARMUP = 5
ITERATIONS = 50

ser = pd.Series(np.arange(SIZE) * 1.23456)
df = pd.DataFrame({
    "price": np.arange(SIZE) * 9.99,
    "pct": (np.arange(SIZE) % 100) / 100,
})

def fmt_float(decimals): return lambda v: f"{v:.{decimals}f}"
def fmt_pct(decimals): return lambda v: f"{v:.{decimals}%}"
def fmt_cur(symbol, decimals): return lambda v: f"{symbol}{v:,.{decimals}f}"

for _ in range(WARMUP):
    ff = fmt_float(2)
    ser.map(ff)
    fc = fmt_cur("$", 2)
    fp = fmt_pct(1)
    df.apply(lambda col: col.map(fc if col.name == "price" else fp))

start = time.perf_counter()
for _ in range(ITERATIONS):
    fmt_float(3)
    fmt_pct(2)
    fmt_cur("€", 2)
    ff = fmt_float(2)
    fc = fmt_cur("$", 2)
    fp = fmt_pct(1)
    ser.map(ff)
    df.apply(lambda col: col.map(fc if col.name == "price" else fp))
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "formatter_factories_fn",
    "mean_ms": round(total / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total, 3),
}))
