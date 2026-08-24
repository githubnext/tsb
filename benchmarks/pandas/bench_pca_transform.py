"""Benchmark: PCA fit_transform, transform, inverse_transform.

Mirrors sklearn.decomposition.PCA using numpy SVD directly (no sklearn required).
Dataset: 1,000 observations x 10 features, reducing to 5 components.

Outputs JSON: {"function": "pca_transform", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
import numpy as np

N = 1_000
P = 10
N_COMPONENTS = 5
WARMUP = 5
ITERATIONS = 30

# Deterministic dataset with correlated features (same pattern as TS version)
i_vals = np.arange(N)
j_vals = np.arange(P)
X = np.sin(np.outer(i_vals * 0.05, np.ones(P)) + np.outer(np.ones(N), j_vals * 0.3)) * 10
X += np.outer(np.ones(N), j_vals * 3)


def pca_fit_transform(X_data: np.ndarray, n_components: int):
    """Pure-numpy PCA: center, SVD, project."""
    mean = X_data.mean(axis=0)
    X_c = X_data - mean
    # Economy SVD
    U, s, Vt = np.linalg.svd(X_c, full_matrices=False)
    components = Vt[:n_components]
    scores = X_c @ components.T
    return scores, components, mean


def pca_transform(X_data: np.ndarray, components: np.ndarray, mean: np.ndarray):
    """Project new data onto already-fitted components."""
    return (X_data - mean) @ components.T


def pca_inverse_transform(scores: np.ndarray, components: np.ndarray, mean: np.ndarray):
    """Reconstruct approximate original data from projected scores."""
    return scores @ components + mean


def run():
    scores, components, mean = pca_fit_transform(X, N_COMPONENTS)
    pca_transform(X, components, mean)
    pca_inverse_transform(scores, components, mean)


for _ in range(WARMUP):
    run()

start = time.perf_counter()
for _ in range(ITERATIONS):
    run()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "pca_transform",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
