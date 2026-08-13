"""Benchmark: linregress + OLS regression on 10,000-row dataset.
Uses pure numpy to implement linregress and OLS (lstsq), matching tsb.
"""
import json
import time
import numpy as np

N = 10_000
WARMUP = 5
ITERATIONS = 20

x = np.arange(N) / N
noise = np.sin(np.arange(N) * 0.37) * 0.1
y = 2.5 * x + 1.2 + noise

# OLS setup: two predictors + intercept column
x2 = np.cos(np.arange(N) * 0.1)
X = np.column_stack([x, x2, np.ones(N)])


def numpy_linregress(x_arr, y_arr):
    """Pure-numpy simple linear regression (mirrors scipy.stats.linregress)."""
    n = len(x_arr)
    xm = x_arr.mean()
    ym = y_arr.mean()
    sxx = ((x_arr - xm) ** 2).sum()
    sxy = ((x_arr - xm) * (y_arr - ym)).sum()
    slope = sxy / sxx
    intercept = ym - slope * xm
    return slope, intercept


def ols_fit(X_mat, y_vec):
    """Numpy lstsq-based OLS (mirrors tsb OLS with addIntercept=True)."""
    coeffs, _, _, _ = np.linalg.lstsq(X_mat, y_vec, rcond=None)
    return coeffs


for _ in range(WARMUP):
    numpy_linregress(x, y)
    ols_fit(X, y)

start = time.perf_counter()
for _ in range(ITERATIONS):
    numpy_linregress(x, y)
    ols_fit(X, y)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "regression",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
