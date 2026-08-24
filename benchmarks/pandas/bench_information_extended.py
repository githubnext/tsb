import scipy.stats
import numpy as np
import json
import time

N = 1000
WARMUP = 5
ITERS = 50

BINS = 100
pk = np.arange(1, BINS + 1, dtype=float)
pk /= pk.sum()
qk = pk[::-1].copy()

CATS = 10
xs = np.array([i % CATS for i in range(N)])
ys = np.array([(i % CATS + i // CATS) % CATS for i in range(N)])

def js_divergence(p, q):
    m = 0.5 * (p + q)
    return 0.5 * scipy.stats.entropy(p, m) + 0.5 * scipy.stats.entropy(q, m)

def js_distance(p, q):
    return js_divergence(p, q) ** 0.5

def cross_entropy(p, q):
    return -np.sum(p * np.log(q + 1e-300))

def renyi_entropy(p, alpha):
    return np.log(np.sum(p ** alpha)) / (1 - alpha)

def tsallis_entropy(p, q_param):
    return (1 - np.sum(p ** q_param)) / (q_param - 1)

def joint_entropy(x, y):
    pairs, counts = np.unique(np.stack([x, y], axis=1), axis=0, return_counts=True)
    probs = counts / counts.sum()
    return -np.sum(probs * np.log(probs + 1e-300))

def conditional_entropy(x, y):
    return joint_entropy(x, y) - scipy.stats.entropy(np.unique(x, return_counts=True)[1])

def variation_of_information(x, y):
    hx = scipy.stats.entropy(np.unique(x, return_counts=True)[1] / len(x))
    hy = scipy.stats.entropy(np.unique(y, return_counts=True)[1] / len(y))
    hxy = joint_entropy(x, y)
    return hx + hy - 2 * hxy

# Warm up
for _ in range(WARMUP):
    js_divergence(pk, qk)
    js_distance(pk, qk)
    cross_entropy(pk, qk)
    renyi_entropy(pk, 2)
    tsallis_entropy(pk, 2)
    joint_entropy(xs, ys)
    conditional_entropy(xs, ys)
    variation_of_information(xs, ys)

t0 = time.perf_counter()
for _ in range(ITERS):
    js_divergence(pk, qk)
    js_distance(pk, qk)
    cross_entropy(pk, qk)
    renyi_entropy(pk, 2)
    tsallis_entropy(pk, 2)
    joint_entropy(xs, ys)
    conditional_entropy(xs, ys)
    variation_of_information(xs, ys)
total_ms = (time.perf_counter() - t0) * 1000

print(json.dumps({
    "function": "information_extended",
    "mean_ms": total_ms / ITERS,
    "iterations": ITERS,
    "total_ms": total_ms,
}))
