"""
Benchmark: stack / unstack

Mirrors tsb bench_stack_unstack.ts.
Dataset: 1000-row × 5-column DataFrame of random floats.
Operations measured:
  - stack()   — pivot column labels into the row index → Series
  - unstack() — reverse the stack back to a DataFrame
"""

import json
import time
import numpy as np
import pandas as pd

ROWS = 1_000
COLS = ["a", "b", "c", "d", "e"]
WARMUP = 3
ITERS = 20

# ── build dataset ─────────────────────────────────────────────────────────────

rng = np.random.default_rng(42)
data = {col: rng.random(ROWS) * 100 for col in COLS}
df = pd.DataFrame(data)

# ── warm-up ───────────────────────────────────────────────────────────────────

for _ in range(WARMUP):
    s = df.stack()
    s.unstack()

# ── measure stack ─────────────────────────────────────────────────────────────

t0 = time.perf_counter()
for _ in range(ITERS):
    df.stack(future_stack=True)
stack_ms = (time.perf_counter() - t0) / ITERS * 1000

# ── measure unstack ───────────────────────────────────────────────────────────

stacked = df.stack(future_stack=True)
t1 = time.perf_counter()
for _ in range(ITERS):
    stacked.unstack()
unstack_ms = (time.perf_counter() - t1) / ITERS * 1000

mean_ms = (stack_ms + unstack_ms) / 2

print(json.dumps({
    "function": "stack_unstack",
    "mean_ms": round(mean_ms, 4),
    "stack_ms": round(stack_ms, 4),
    "unstack_ms": round(unstack_ms, 4),
    "iterations": ITERS,
    "rows": ROWS,
    "cols": len(COLS),
}))
