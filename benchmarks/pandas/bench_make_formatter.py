import pandas as pd, time, json
WARMUP = 3
ITERS = 10_000
def make_float_fmt(d):
    return lambda x: f"{x:.{d}f}"
def make_pct_fmt(d):
    return lambda x: f"{x*100:.{d}f}%"
def make_curr_fmt(sym, d):
    return lambda x: f"{sym}{x:.{d}f}"
for _ in range(WARMUP):
    make_float_fmt(2)
    make_pct_fmt(1)
    make_curr_fmt("$", 2)
t0 = time.perf_counter()
for _ in range(ITERS):
    make_float_fmt(2)
    make_pct_fmt(1)
    make_curr_fmt("$", 2)
total = (time.perf_counter() - t0) * 1000
print(json.dumps({"function": "make_formatter", "mean_ms": total / ITERS, "iterations": ITERS, "total_ms": total}))
