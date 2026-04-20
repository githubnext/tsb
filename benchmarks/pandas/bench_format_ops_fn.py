"""Benchmark: number formatting operations (float, percent, scientific, etc.).
Mirrors tsb bench_format_ops_fn.ts using Python format functions.
"""
import json, time

SIZE = 10_000
WARMUP = 5
ITERATIONS = 50

values = [i * 1234.567 + 0.001 for i in range(SIZE)]

def fmt_float(v, decimals=6): return f"{v:.{decimals}f}"
def fmt_percent(v, decimals=2): return f"{v:.{decimals}%}"
def fmt_scientific(v, decimals=6): return f"{v:.{decimals}e}"
def fmt_engineering(v): return f"{v:.6g}"
def fmt_thousands(v): return f"{v:,.2f}"
def fmt_currency(v): return f"${v:,.2f}"
def fmt_compact(v):
    if abs(v) >= 1e9: return f"{v/1e9:.1f}B"
    if abs(v) >= 1e6: return f"{v/1e6:.1f}M"
    if abs(v) >= 1e3: return f"{v/1e3:.1f}K"
    return f"{v:.1f}"

for _ in range(WARMUP):
    for v in values[:100]:
        fmt_float(v, 2)
        fmt_percent(v / 100_000, 1)
        fmt_scientific(v, 3)

start = time.perf_counter()
for _ in range(ITERATIONS):
    for v in values:
        fmt_float(v, 2)
        fmt_percent(v / 100_000, 1)
        fmt_scientific(v, 3)
        fmt_engineering(v)
        fmt_thousands(v)
        fmt_currency(v)
        fmt_compact(v)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "format_ops_fn",
    "mean_ms": round(total / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total, 3),
}))
