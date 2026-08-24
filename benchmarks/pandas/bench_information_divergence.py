import pandas as pd
import numpy as np
import json
import time

try:
    from scipy.stats import entropy as scipy_entropy
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False

N = 200
WARMUP = 5
ITERS = 50

# Two probability distributions of length N
p = np.arange(1, N + 1, dtype=float)
p /= p.sum()
q = np.arange(N, 0, -1, dtype=float)
q /= q.sum()

# Paired observations for joint/conditional metrics
CATS = 20
xs = np.arange(2000) % CATS
ys = xs + (np.arange(2000) // CATS % 5)

def js_divergence(p, q):
    m = 0.5 * (p + q)
    def kl(a, b):
        mask = (a > 0) & (b > 0)
        return np.sum(a[mask] * np.log(a[mask] / b[mask]))
    return 0.5 * kl(p, m) + 0.5 * kl(q, m)

def cross_entropy(p, q):
    mask = (p > 0) & (q > 0)
    return -np.sum(p[mask] * np.log(q[mask]))

def renyi_entropy(p, alpha, base=np.e):
    if alpha == 1:
        mask = p > 0
        return -np.sum(p[mask] * np.log(p[mask])) / np.log(base)
    return np.log(np.sum(p**alpha)) / (1 - alpha) / np.log(base)

def tsallis_entropy(p, q_val, base=np.e):
    if q_val == 1:
        mask = p > 0
        return -np.sum(p[mask] * np.log(p[mask])) / np.log(base)
    return (1 - np.sum(p**q_val)) / (q_val - 1)

def joint_entropy(xs, ys):
    unique_pairs, counts = np.unique(np.column_stack([xs, ys]), axis=0, return_counts=True)
    probs = counts / counts.sum()
    return -np.sum(probs * np.log(probs + 1e-300))

def conditional_entropy(xs, ys):
    hxy = joint_entropy(xs, ys)
    _, ycounts = np.unique(ys, return_counts=True)
    yprobs = ycounts / ycounts.sum()
    hy = -np.sum(yprobs * np.log(yprobs + 1e-300))
    return hxy - hy

def variation_of_information(xs, ys):
    hxy = joint_entropy(xs, ys)
    _, xc = np.unique(xs, return_counts=True)
    xp = xc / xc.sum()
    hx = -np.sum(xp * np.log(xp + 1e-300))
    _, yc = np.unique(ys, return_counts=True)
    yp = yc / yc.sum()
    hy = -np.sum(yp * np.log(yp + 1e-300))
    mi = hx + hy - hxy
    return hx + hy - 2 * mi

# Warmup
for _ in range(WARMUP):
    js_divergence(p, q)
    cross_entropy(p, q)
    renyi_entropy(p, 2)
    tsallis_entropy(p, 2)
    joint_entropy(xs, ys)
    conditional_entropy(xs, ys)
    variation_of_information(xs, ys)

t0 = time.perf_counter()
for _ in range(ITERS):
    js_divergence(p, q)
    cross_entropy(p, q)
    renyi_entropy(p, 2)
    tsallis_entropy(p, 2)
    joint_entropy(xs, ys)
    conditional_entropy(xs, ys)
    variation_of_information(xs, ys)
total_ms = (time.perf_counter() - t0) * 1000

print(json.dumps({
    "function": "information_divergence",
    "mean_ms": total_ms / ITERS,
    "iterations": ITERS,
    "total_ms": total_ms,
}))
