"""
Benchmark: advanced information theory functions.
Mirrors the TypeScript bench_information_advanced.ts benchmark.
Uses pure numpy (no scipy) for JS divergence, Rényi entropy, Tsallis entropy,
joint entropy, conditional entropy, NMI, and variation of information.
Outputs JSON: {"function": "...", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""

import json
import time
from collections import Counter
import numpy as np

N = 200
WARMUP = 5
ITERS = 50

p_raw = np.arange(1, N + 1, dtype=float)
q_raw = np.arange(N, 0, -1, dtype=float)

# Paired observations for joint/conditional entropy
obs_x = [f"c{i % 5}" for i in range(1000)]
obs_y = [f"d{i % 4}" for i in range(1000)]


def _norm(arr: np.ndarray) -> np.ndarray:
    s = arr.sum()
    return arr / s if s > 0 else arr


def js_divergence(p: np.ndarray, q: np.ndarray) -> float:
    p_n = _norm(p[p > 0])
    q_n = _norm(q[q > 0])
    # Rebuild full-length normalized arrays for mixture
    pf = _norm(p)
    qf = _norm(q)
    m = (pf + qf) / 2.0
    kl_pm = np.sum(pf[pf > 0] * np.log(pf[pf > 0] / m[pf > 0]))
    kl_qm = np.sum(qf[qf > 0] * np.log(qf[qf > 0] / m[qf > 0]))
    return 0.5 * kl_pm + 0.5 * kl_qm


def js_distance(p: np.ndarray, q: np.ndarray) -> float:
    return float(np.sqrt(max(0.0, js_divergence(p, q))))


def cross_entropy(p: np.ndarray, q: np.ndarray) -> float:
    pn = _norm(p)
    qn = _norm(q)
    mask = (pn > 0) & (qn > 0)
    return float(-np.sum(pn[mask] * np.log(qn[mask])))


def renyi_entropy(p: np.ndarray, alpha: float) -> float:
    pn = _norm(p[p > 0])
    if abs(alpha - 1.0) < 1e-10:
        return float(-np.sum(pn * np.log(pn)))
    return float(np.log(np.sum(pn**alpha)) / (1.0 - alpha))


def tsallis_entropy(p: np.ndarray, q_param: float) -> float:
    pn = _norm(p[p > 0])
    if abs(q_param - 1.0) < 1e-10:
        return float(-np.sum(pn * np.log(pn)))
    return float((1.0 - np.sum(pn**q_param)) / (q_param - 1.0))


def joint_entropy(xs, ys) -> float:
    counts = Counter(zip(xs, ys))
    total = len(xs)
    probs = np.array([c / total for c in counts.values()])
    return float(-np.sum(probs * np.log(probs)))


def conditional_entropy(xs, ys) -> float:
    joint = Counter(zip(xs, ys))
    y_counts = Counter(ys)
    total = len(xs)
    h = 0.0
    for (x, y), c in joint.items():
        p_xy = c / total
        p_y = y_counts[y] / total
        h -= p_xy * np.log(p_xy / p_y)
    return h


def marginal_entropy(xs) -> float:
    counts = Counter(xs)
    total = len(xs)
    probs = np.array([c / total for c in counts.values()])
    return float(-np.sum(probs * np.log(probs)))


def mutual_information(xs, ys) -> float:
    return marginal_entropy(xs) + marginal_entropy(ys) - joint_entropy(xs, ys)


def normalized_mi(xs, ys) -> float:
    hx = marginal_entropy(xs)
    hy = marginal_entropy(ys)
    mi = mutual_information(xs, ys)
    denom = 0.5 * (hx + hy)
    return mi / denom if denom > 0 else 0.0


def variation_of_information(xs, ys) -> float:
    hx = marginal_entropy(xs)
    hy = marginal_entropy(ys)
    mi = mutual_information(xs, ys)
    return hx + hy - 2.0 * mi


for _ in range(WARMUP):
    js_divergence(p_raw, q_raw)
    js_distance(p_raw, q_raw)
    cross_entropy(p_raw, q_raw)
    renyi_entropy(p_raw, 0.5)
    tsallis_entropy(p_raw, 2)
    joint_entropy(obs_x, obs_y)
    conditional_entropy(obs_x, obs_y)
    normalized_mi(obs_x, obs_y)
    variation_of_information(obs_x, obs_y)

t0 = time.perf_counter()
for _ in range(ITERS):
    js_divergence(p_raw, q_raw)
    js_distance(p_raw, q_raw)
    cross_entropy(p_raw, q_raw)
    renyi_entropy(p_raw, 0.5)
    tsallis_entropy(p_raw, 2)
    joint_entropy(obs_x, obs_y)
    conditional_entropy(obs_x, obs_y)
    normalized_mi(obs_x, obs_y)
    variation_of_information(obs_x, obs_y)
total_ms = (time.perf_counter() - t0) * 1000

print(json.dumps({
    "function": "information_advanced",
    "mean_ms": total_ms / ITERS,
    "iterations": ITERS,
    "total_ms": total_ms,
}))
