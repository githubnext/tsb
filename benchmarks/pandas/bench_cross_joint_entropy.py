import numpy as np
import json
import time

N = 100
WARMUP = 5
ITERS = 50

p = np.arange(1, N + 1, dtype=float)
q = np.arange(N, 0, -1, dtype=float)

# Paired observations for joint/conditional entropy
labels = ["a", "b", "c", "d"]
obs = [(labels[i % 4], labels[(i * 3) % 4]) for i in range(1000)]


def cross_entropy(pk, qk):
    pk = pk / pk.sum()
    qk = qk / qk.sum()
    return -np.sum(pk * np.log(qk + 1e-300))


def joint_entropy(xy):
    from collections import Counter
    counts = Counter(xy)
    total = len(xy)
    probs = np.array(list(counts.values()), dtype=float) / total
    return -np.sum(probs * np.log(probs + 1e-300))


def conditional_entropy(xy):
    from collections import Counter
    x_counts = Counter(x for x, _ in xy)
    xy_counts = Counter(xy)
    total = len(xy)
    h = 0.0
    for (x, y), c_xy in xy_counts.items():
        p_xy = c_xy / total
        p_x = x_counts[x] / total
        h -= p_xy * np.log(p_xy / (p_x + 1e-300))
    return h


for _ in range(WARMUP):
    cross_entropy(p, q)
    joint_entropy(obs)
    conditional_entropy(obs)

t0 = time.perf_counter()
for _ in range(ITERS):
    cross_entropy(p, q)
    joint_entropy(obs)
    conditional_entropy(obs)
total_ms = (time.perf_counter() - t0) * 1000

print(json.dumps({
    "function": "cross_joint_conditional_entropy",
    "mean_ms": total_ms / ITERS,
    "iterations": ITERS,
    "total_ms": total_ms,
}))
