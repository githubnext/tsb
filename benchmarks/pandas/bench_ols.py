"""Benchmark: OLS (Ordinary Least Squares) multiple regression on 10k rows x 5 predictors"""
import json, time
import numpy as np

ROWS = 10_000
WARMUP = 5
ITERATIONS = 20

rng = np.random.default_rng(42)
X = rng.uniform(-1, 1, size=(ROWS, 5))
# y = 1*x1 + 2*x2 - 0.5*x3 + 3*x4 + 0.1*x5 + noise
coefs = np.array([1.0, 2.0, -0.5, 3.0, 0.1])
y = X @ coefs + rng.normal(0, 0.05, size=ROWS)

# Add intercept column (matching tsb OLS default addIntercept=true)
X_design = np.column_stack([X, np.ones(ROWS)])

for _ in range(WARMUP):
    np.linalg.lstsq(X_design, y, rcond=None)

start = time.perf_counter()
for _ in range(ITERATIONS):
    np.linalg.lstsq(X_design, y, rcond=None)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "ols",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
