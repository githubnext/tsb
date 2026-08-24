import numpy as np
import json
import time

N = 1000
WARMUP = 5
ITERS = 50

p = np.arange(1, N + 1, dtype=float)
q = np.arange(N, 0, -1, dtype=float)

p_norm = p / p.sum()
q_norm = q / q.sum()

CATS = 20
xs = np.arange(N) % CATS
ys = (np.arange(N) + 3) % CATS


def js_divergence(pk, qk):
    pk = pk / pk.sum()
    qk = qk / qk.sum()
    m = 0.5 * (pk + qk)
    eps = 1e-300
    kl_pm = np.sum(pk * np.log(pk / (m + eps) + eps))
    kl_qm = np.sum(qk * np.log(qk / (m + eps) + eps))
    return 0.5 * (kl_pm + kl_qm)


def js_distance(pk, qk):
    return np.sqrt(max(js_divergence(pk, qk), 0.0))


def cross_entropy(pk, qk):
    pk = pk / pk.sum()
    qk = qk / qk.sum()
    return -np.sum(pk * np.log(qk + 1e-300))


def conditional_entropy(xs_arr, ys_arr):
    n = len(xs_arr)
    cats_x = np.unique(xs_arr)
    cats_y = np.unique(ys_arr)
    h = 0.0
    for x in cats_x:
        mask = xs_arr == x
        px = mask.sum() / n
        ys_given_x = ys_arr[mask]
        for y in cats_y:
            pxy = (ys_given_x == y).sum() / n
            if pxy > 0:
                h -= pxy * np.log(pxy / (px + 1e-300))
    return h


for _ in range(WARMUP):
    js_divergence(p, q)
    js_distance(p, q)
    cross_entropy(p, q)
    conditional_entropy(xs, ys)

t0 = time.perf_counter()
for _ in range(ITERS):
    js_divergence(p, q)
    js_distance(p, q)
    cross_entropy(p, q)
    conditional_entropy(xs, ys)
total_ms = (time.perf_counter() - t0) * 1000

print(json.dumps({
    "function": "js_divergence",
    "mean_ms": total_ms / ITERS,
    "iterations": ITERS,
    "total_ms": total_ms,
}))
