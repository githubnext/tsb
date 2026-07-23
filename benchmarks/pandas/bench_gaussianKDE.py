"""Benchmark: Gaussian KDE evaluate on 1000-point dataset at 200 grid points.
Uses Scott bandwidth (numpy equivalent of Silverman for univariate data).
Pure numpy implementation to match pages workflow constraints.
"""
import json
import time
import numpy as np

N = 1_000
GRID = 200
WARMUP = 3
ITERATIONS = 20

# Create dataset: mix of two gaussians (same as TS benchmark)
i_vals = np.arange(N)
data = np.sin(i_vals * 0.01) * 2 + np.where(i_vals % 2 == 0, 0.0, 5.0)

xmin, xmax = -5.0, 10.0
grid = np.linspace(xmin, xmax, GRID)


def gaussian_kde_evaluate(data: np.ndarray, points: np.ndarray) -> np.ndarray:
    """Gaussian KDE with Silverman bandwidth, pure numpy."""
    n = len(data)
    std = np.std(data, ddof=1)
    bw = (4.0 / (3.0 * n)) ** 0.2 * std  # Silverman rule
    diff = points[:, np.newaxis] - data[np.newaxis, :]  # (GRID, N)
    kernels = np.exp(-0.5 * (diff / bw) ** 2) / (bw * np.sqrt(2 * np.pi))
    return kernels.mean(axis=1)


for _ in range(WARMUP):
    gaussian_kde_evaluate(data, grid)

start = time.perf_counter()
for _ in range(ITERATIONS):
    gaussian_kde_evaluate(data, grid)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "gaussianKDE",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
