import json
import time
import numpy as np

N = 1000
WARMUP = 5
ITERS = 50

# Build paired observations: two correlated categorical variables (10 categories each)
CATS = 10
x = np.array([i % CATS for i in range(N)])
y = np.array([(i % CATS + (i // CATS) % 3) % CATS for i in range(N)])


def joint_entropy(x, y):
    """H(X, Y) from paired observations."""
    pairs, counts = np.unique(np.stack([x, y], axis=1), axis=0, return_counts=True)
    p = counts / counts.sum()
    return -np.sum(p * np.log(p + 1e-300))


def conditional_entropy(x, y):
    """H(X|Y) = H(X,Y) - H(Y)."""
    _, y_counts = np.unique(y, return_counts=True)
    p_y = y_counts / y_counts.sum()
    h_y = -np.sum(p_y * np.log(p_y + 1e-300))
    h_xy = joint_entropy(x, y)
    return max(0.0, h_xy - h_y)


def variation_of_information(x, y):
    """VI(X,Y) = H(X|Y) + H(Y|X)."""
    _, x_counts = np.unique(x, return_counts=True)
    _, y_counts = np.unique(y, return_counts=True)
    p_x = x_counts / x_counts.sum()
    p_y = y_counts / y_counts.sum()
    h_x = -np.sum(p_x * np.log(p_x + 1e-300))
    h_y = -np.sum(p_y * np.log(p_y + 1e-300))
    h_xy = joint_entropy(x, y)
    mi = max(0.0, h_x + h_y - h_xy)
    return max(0.0, h_x + h_y - 2 * mi)


for _ in range(WARMUP):
    joint_entropy(x, y)
    conditional_entropy(x, y)
    variation_of_information(x, y)

t0 = time.perf_counter()
for _ in range(ITERS):
    joint_entropy(x, y)
    conditional_entropy(x, y)
    variation_of_information(x, y)
total_ms = (time.perf_counter() - t0) * 1000

print(json.dumps({
    "function": "joint_cond_entropy",
    "mean_ms": total_ms / ITERS,
    "iterations": ITERS,
    "total_ms": total_ms,
}))
