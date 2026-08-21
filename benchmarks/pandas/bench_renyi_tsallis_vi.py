import numpy as np
import json
import time
from scipy.stats import entropy as scipy_entropy

N = 1000
WARMUP = 5
ITERS = 50

# Build a probability distribution of length N (matches TS version)
pk_raw = np.arange(1, N + 1, dtype=float)
pk = pk_raw / pk_raw.sum()

# Build joint distribution pairs for variation of information
labels_x = np.array([i % 10 for i in range(N)])
labels_y = np.array([i % 7 for i in range(N)])


def renyi_entropy(p: np.ndarray, alpha: float) -> float:
    """Rényi entropy H_alpha(X)."""
    if alpha == 1.0:
        return float(scipy_entropy(p))
    return float(np.log(np.sum(p ** alpha)) / (1.0 - alpha))


def tsallis_entropy(p: np.ndarray, q: float) -> float:
    """Tsallis entropy S_q(X)."""
    if q == 1.0:
        return float(scipy_entropy(p))
    return float((1.0 - np.sum(p ** q)) / (q - 1.0))


def variation_of_information(lx: np.ndarray, ly: np.ndarray) -> float:
    """Variation of information VI(X,Y) = H(X|Y) + H(Y|X)."""
    n = len(lx)
    ux, cx = np.unique(lx, return_counts=True)
    uy, cy = np.unique(ly, return_counts=True)
    px = cx / n
    py = cy / n
    hx = float(scipy_entropy(px))
    hy = float(scipy_entropy(py))
    # joint entropy
    joint = {}
    for xi, yi in zip(lx, ly):
        key = (xi, yi)
        joint[key] = joint.get(key, 0) + 1
    pxy = np.array(list(joint.values()), dtype=float) / n
    hxy = float(scipy_entropy(pxy))
    return hx + hy - 2.0 * hxy  # VI = H(X) + H(Y) - 2*I(X;Y)


# Warm up
for _ in range(WARMUP):
    renyi_entropy(pk, 2.0)
    tsallis_entropy(pk, 2.0)
    variation_of_information(labels_x, labels_y)

start = time.perf_counter()
for _ in range(ITERS):
    renyi_entropy(pk, 0.5)
    renyi_entropy(pk, 2.0)
    tsallis_entropy(pk, 0.5)
    tsallis_entropy(pk, 2.0)
    variation_of_information(labels_x, labels_y)
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "renyi_tsallis_vi",
    "mean_ms": total / ITERS,
    "iterations": ITERS,
    "total_ms": total,
}))
