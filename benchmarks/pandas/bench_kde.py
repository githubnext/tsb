"""Benchmark: GaussianKDE — kernel density estimation.

Pure-numpy implementation matching scipy.stats.gaussian_kde (Silverman bandwidth).
  - fit KDE to 1000-point dataset
  - evaluate PDF at 100 grid points
  - integrate density over interval [-1, 1] via grid quadrature
  - log-PDF at single point

Dataset: 1000 points, 100-point evaluation grid.
Outputs JSON: {"function": "kde", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np

N = 1_000
GRID = 100
WARMUP = 5
ITERATIONS = 50

# Bimodal dataset: same as TS version
data = np.array([
    np.sin(i * 1.7) * 0.5 + (-1.5 if i % 2 == 0 else 1.5)
    for i in range(N)
])
grid = np.linspace(-4, 4, GRID)


def gaussian_kde_numpy(data):
    """Fit a Gaussian KDE with Silverman bandwidth. Returns (bw, std, data)."""
    n = len(data)
    std = np.std(data, ddof=1)
    bw = (4 / (3 * n)) ** 0.2 * std  # Silverman rule
    return bw, std, data


def kde_evaluate(bw, data, points):
    """Evaluate Gaussian KDE PDF at given points."""
    # Vectorised: shape (len(points), len(data))
    u = (points[:, None] - data[None, :]) / bw
    kernels = np.exp(-0.5 * u * u) / (np.sqrt(2 * np.pi) * bw * len(data))
    return kernels.sum(axis=1)


def kde_integrate(bw, data, a, b, steps=200):
    """Integrate KDE PDF from a to b via trapezoid rule."""
    xs = np.linspace(a, b, steps)
    ys = kde_evaluate(bw, data, xs)
    return np.trapz(ys, xs)


def kde_logpdf(bw, data, x):
    """Log-PDF at a single point."""
    val = kde_evaluate(bw, data, np.array([x]))[0]
    return np.log(max(val, 1e-300))


# Warm up
for _ in range(WARMUP):
    bw, std, d = gaussian_kde_numpy(data)
    kde_evaluate(bw, d, grid)
    kde_integrate(bw, d, -1, 1)

start = time.perf_counter()
for _ in range(ITERATIONS):
    bw, std, d = gaussian_kde_numpy(data)
    kde_evaluate(bw, d, grid)
    kde_integrate(bw, d, -1, 1)
    kde_logpdf(bw, d, 0.0)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "kde",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
