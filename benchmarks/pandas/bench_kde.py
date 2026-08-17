"""Benchmark: GaussianKDE — kernel density estimation.

Mirrors scipy.stats.gaussian_kde:
  - gaussian_kde(data)         — fit KDE to 1000-point dataset
  - kde.pdf(x)                 — evaluate PDF at single point
  - kde.evaluate(points)       — evaluate PDF at 100 grid points
  - kde.integrate_box_1d(a, b) — integrate density over interval
  - kde.logpdf(x)              — log-PDF at single point

Dataset: 1000 points, 100-point evaluation grid.
Outputs JSON: {"function": "kde", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np
from scipy.stats import gaussian_kde

N = 1_000
GRID = 100
WARMUP = 5
ITERATIONS = 50

# Bimodal dataset: mix of two Gaussians (same as TS version)
data = np.array([
    np.sin(i * 1.7) * 0.5 + (-1.5 if i % 2 == 0 else 1.5)
    for i in range(N)
])
grid = np.linspace(-4, 4, GRID)

# Warm up
for _ in range(WARMUP):
    kde = gaussian_kde(data)
    kde.evaluate(grid)
    kde.integrate_box_1d(-1, 1)

start = time.perf_counter()
for _ in range(ITERATIONS):
    kde = gaussian_kde(data)
    kde.evaluate(grid)
    kde.integrate_box_1d(-1, 1)
    kde.logpdf(np.array([0.0]))
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "kde",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
