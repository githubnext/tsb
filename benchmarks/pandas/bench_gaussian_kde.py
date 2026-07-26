"""Benchmark: Gaussian KDE on 10k data points — evaluate, integrate (pure numpy)"""
import json, time
import numpy as np

N = 10_000
EVAL_POINTS = 200
WARMUP = 3
ITERATIONS = 20

# Generate data from a bimodal distribution
indices = np.arange(N, dtype=np.float64)
t = indices / N
data = np.where(t < 0.5, np.sin(indices * 0.05) * 2 + 3, np.cos(indices * 0.03) * 2 - 3)

eval_pts = np.linspace(-6, -6 + (EVAL_POINTS - 1) * 0.06, EVAL_POINTS)

# Silverman bandwidth (matches tsb default)
std = np.std(data, ddof=1)
bw = (4.0 / (3.0 * N)) ** 0.2 * std

SQRT_2PI = np.sqrt(2.0 * np.pi)

def kde_evaluate(data, eval_pts, bw):
    # shape: (n_eval, n_data)
    z = (eval_pts[:, None] - data[None, :]) / bw
    return np.exp(-0.5 * z * z).sum(axis=1) / (N * bw * SQRT_2PI)

def kde_integrate(data, a, b, bw, n=200):
    xs = np.linspace(a, b, n)
    ys = kde_evaluate(data, xs, bw)
    return np.trapz(ys, xs)

for _ in range(WARMUP):
    kde_evaluate(data, eval_pts, bw)
    kde_integrate(data, -2, 2, bw)

start = time.perf_counter()
for _ in range(ITERATIONS):
    kde_evaluate(data, eval_pts, bw)
    kde_integrate(data, -2, 2, bw)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "gaussian_kde",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
