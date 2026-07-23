import numpy as np
import json
import time

N = 1000
WARMUP = 5
ITERS = 50
CATS = 10

# Same paired observations as the TS benchmark
xs = np.array([i % CATS for i in range(N)])
ys = np.array([(i % CATS) + (i // CATS) % 3 for i in range(N)])


def mutual_information(xs, ys):
    """Compute mutual information I(X;Y) from paired observations."""
    n = len(xs)
    ux, cx = np.unique(xs, return_counts=True)
    uy, cy = np.unique(ys, return_counts=True)
    px = cx / n
    py = cy / n

    # Joint counts
    joint_counts = {}
    for x, y in zip(xs, ys):
        key = (int(x), int(y))
        joint_counts[key] = joint_counts.get(key, 0) + 1

    mi = 0.0
    for (xi, yi), cnt in joint_counts.items():
        pxy = cnt / n
        pxi = px[np.searchsorted(ux, xi)]
        pyi = py[np.searchsorted(uy, yi)]
        if pxy > 0:
            mi += pxy * np.log(pxy / (pxi * pyi + 1e-300))
    return mi


def normalized_mi(xs, ys):
    """Normalized mutual information (arithmetic normalization)."""
    mi = mutual_information(xs, ys)
    n = len(xs)
    _, cx = np.unique(xs, return_counts=True)
    _, cy = np.unique(ys, return_counts=True)
    px = cx / n
    py = cy / n
    hx = -np.sum(px * np.log(px + 1e-300))
    hy = -np.sum(py * np.log(py + 1e-300))
    denom = (hx + hy) / 2
    return mi / denom if denom > 0 else 0.0


for _ in range(WARMUP):
    mutual_information(xs, ys)
    normalized_mi(xs, ys)

t0 = time.perf_counter()
for _ in range(ITERS):
    mutual_information(xs, ys)
    normalized_mi(xs, ys)
total_ms = (time.perf_counter() - t0) * 1000

print(json.dumps({
    "function": "mutual_information",
    "mean_ms": total_ms / ITERS,
    "iterations": ITERS,
    "total_ms": total_ms,
}))
