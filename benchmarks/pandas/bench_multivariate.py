"""Benchmark: multivariate statistics — Mahalanobis distance, covariance matrix, PCA
Dataset: 500 observations x 5 features (matching the TypeScript benchmark)
"""
import json
import time
import numpy as np

N = 500
P = 5
WARMUP = 3
ITERATIONS = 20

# Generate deterministic dataset matching TS version
i_idx = np.arange(N)
j_idx = np.arange(P)
X = np.sin(i_idx[:, None] * 0.1 + j_idx[None, :]) * 10 + j_idx[None, :] * 2  # (N, P)

u = X[0]
v = X[1]

# Pre-compute covariance and diagonal inverse covariance
cov = np.cov(X, rowvar=False)  # (P, P) sample covariance
diag_inv_cov = np.diag(1.0 / np.maximum(np.diag(cov), 1e-10))  # diagonal approx of VI


def run_iteration(X, u, v, diag_inv_cov):
    # Mahalanobis distance with pre-computed VI
    diff = u - v
    dist = np.sqrt(diff @ diag_inv_cov @ diff)
    # Covariance matrix
    cov_m = np.cov(X, rowvar=False)
    # PCA via SVD (3 components)
    X_centered = X - X.mean(axis=0)
    _, _, Vt = np.linalg.svd(X_centered, full_matrices=False)
    components = Vt[:3]
    scores = X_centered @ components.T
    return dist, cov_m, scores


for _ in range(WARMUP):
    run_iteration(X, u, v, diag_inv_cov)

start = time.perf_counter()
for _ in range(ITERATIONS):
    run_iteration(X, u, v, diag_inv_cov)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "multivariate",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
