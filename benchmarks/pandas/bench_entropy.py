import numpy as np
import json
import time

N = 100
WARMUP = 5
ITERS = 50

p = np.arange(1, N + 1, dtype=float)
q = np.arange(N, 0, -1, dtype=float)

# Normalise
p_norm = p / p.sum()
q_norm = q / q.sum()


def entropy_fn(pk):
    pk = pk / pk.sum()
    return -np.sum(pk * np.log(pk + 1e-300))


def kl_divergence(pk, qk):
    pk = pk / pk.sum()
    qk = qk / qk.sum()
    mask = pk > 0
    return np.sum(pk[mask] * np.log(pk[mask] / (qk[mask] + 1e-300)))


for _ in range(WARMUP):
    entropy_fn(p)
    kl_divergence(p, q)

t0 = time.perf_counter()
for _ in range(ITERS):
    entropy_fn(p)
    kl_divergence(p, q)
total_ms = (time.perf_counter() - t0) * 1000

print(json.dumps({
    "function": "entropy_klDivergence",
    "mean_ms": total_ms / ITERS,
    "iterations": ITERS,
    "total_ms": total_ms,
}))
