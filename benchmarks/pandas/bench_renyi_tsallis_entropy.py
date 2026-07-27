import numpy as np
import json
import time

N = 200
WARMUP = 5
ITERS = 50

p = np.arange(1, N + 1, dtype=float)
q = np.arange(N, 0, -1, dtype=float)


def renyi_entropy(pk, alpha=2):
    pk = pk / pk.sum()
    if abs(alpha - 1) < 1e-10:
        return -np.sum(pk * np.log(pk + 1e-300))
    sum_pow = np.sum(pk ** alpha)
    return np.log(sum_pow) / (1 - alpha)


def tsallis_entropy(pk, q_param=2):
    pk = pk / pk.sum()
    if abs(q_param - 1) < 1e-10:
        return -np.sum(pk * np.log(pk + 1e-300))
    sum_pow = np.sum(pk ** q_param)
    return (1 - sum_pow) / (q_param - 1)


def js_divergence(pk, qk):
    pk = pk / pk.sum()
    qk = qk / qk.sum()
    m = 0.5 * (pk + qk)
    kl_pm = np.sum(pk * np.log((pk + 1e-300) / (m + 1e-300)))
    kl_qm = np.sum(qk * np.log((qk + 1e-300) / (m + 1e-300)))
    return 0.5 * kl_pm + 0.5 * kl_qm


def js_distance(pk, qk):
    return np.sqrt(js_divergence(pk, qk))


def cross_entropy(pk, qk):
    pk = pk / pk.sum()
    qk = qk / qk.sum()
    return -np.sum(pk * np.log(qk + 1e-300))


for _ in range(WARMUP):
    renyi_entropy(p)
    tsallis_entropy(p)
    js_divergence(p, q)
    js_distance(p, q)
    cross_entropy(p, q)

t0 = time.perf_counter()
for _ in range(ITERS):
    renyi_entropy(p)
    tsallis_entropy(p)
    js_divergence(p, q)
    js_distance(p, q)
    cross_entropy(p, q)
total_ms = (time.perf_counter() - t0) * 1000

print(json.dumps({
    "function": "renyi_tsallis_entropy",
    "mean_ms": total_ms / ITERS,
    "iterations": ITERS,
    "total_ms": total_ms,
}))
