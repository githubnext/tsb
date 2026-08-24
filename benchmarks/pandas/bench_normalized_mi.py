"""
Benchmark: normalized mutual information with four normalization methods
— arithmetic, geometric, min, max —
on 1000 paired categorical observations (10 categories each).

Pure-numpy implementation mirroring tsb's normalizedMI.
"""

import time
import json
import math
from collections import Counter

N = 1000
WARMUP = 5
ITERS = 50
CATS = 10


def _entropy_from_counts(counts, n):
    """Shannon entropy (nats) from a Counter of counts."""
    h = 0.0
    for c in counts.values():
        p = c / n
        if p > 0:
            h -= p * math.log(p)
    return h


def normalized_mi(pairs, method="arithmetic"):
    """
    Normalized Mutual Information between X and Y.

    pairs: list of (x, y) tuples
    method: 'arithmetic' | 'geometric' | 'min' | 'max'
    """
    n = len(pairs)
    if n == 0:
        return 0.0

    x_counts = Counter(x for x, _ in pairs)
    y_counts = Counter(y for _, y in pairs)
    joint_counts = Counter(pairs)

    hX = _entropy_from_counts(x_counts, n)
    hY = _entropy_from_counts(y_counts, n)
    hXY = _entropy_from_counts(joint_counts, n)

    mi = max(0.0, hX + hY - hXY)

    if method == "arithmetic":
        denom = 0.5 * (hX + hY)
    elif method == "geometric":
        denom = math.sqrt(hX * hY) if hX > 0 and hY > 0 else 0.0
    elif method == "min":
        denom = min(hX, hY)
    elif method == "max":
        denom = max(hX, hY)
    else:
        denom = 0.5 * (hX + hY)

    return mi / denom if denom > 0 else 0.0


pairs = [(i % CATS, (i % CATS + (i // CATS) % 3) % CATS) for i in range(N)]

for _ in range(WARMUP):
    normalized_mi(pairs, "arithmetic")
    normalized_mi(pairs, "geometric")
    normalized_mi(pairs, "min")
    normalized_mi(pairs, "max")

t0 = time.perf_counter()
for _ in range(ITERS):
    normalized_mi(pairs, "arithmetic")
    normalized_mi(pairs, "geometric")
    normalized_mi(pairs, "min")
    normalized_mi(pairs, "max")
total_ms = (time.perf_counter() - t0) * 1000

print(json.dumps({
    "function": "normalized_mi",
    "mean_ms": total_ms / ITERS,
    "iterations": ITERS,
    "total_ms": total_ms,
}))
