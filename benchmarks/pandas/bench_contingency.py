"""
Benchmark: contingency — expected_freq, relative_risk, odds_ratio, association
Pure-numpy equivalents (no scipy) matching the TypeScript benchmark.
Dataset: same 4x4 table as the TypeScript benchmark.
"""
import json
import time
import numpy as np

WARMUP = 10
ITERS = 50

observed = np.array([
    [120, 80, 40, 60],
    [90, 110, 70, 30],
    [50, 60, 100, 90],
    [40, 50, 90, 120],
], dtype=float)

two_by_two = np.array([
    [60.0, 40.0],
    [30.0, 70.0],
])


def expected_freq(obs):
    row_sums = obs.sum(axis=1, keepdims=True)
    col_sums = obs.sum(axis=0, keepdims=True)
    total = obs.sum()
    return row_sums * col_sums / total


def relative_risk(obs):
    a, b = obs[0, 0], obs[0, 1]
    c, d = obs[1, 0], obs[1, 1]
    risk0 = a / (a + b)
    risk1 = c / (c + d)
    return risk0 / risk1


def odds_ratio(obs):
    a, b = obs[0, 0], obs[0, 1]
    c, d = obs[1, 0], obs[1, 1]
    return (a * d) / (b * c)


def association_cramer(obs):
    exp = expected_freq(obs)
    chi2 = np.sum((obs - exp) ** 2 / exp)
    n = obs.sum()
    r, c = obs.shape
    return np.sqrt(chi2 / n / min(r - 1, c - 1))


# Warm up
for _ in range(WARMUP):
    expected_freq(observed)
    relative_risk(two_by_two)
    odds_ratio(two_by_two)
    association_cramer(observed)

# Measure
start = time.perf_counter()
for _ in range(ITERS):
    expected_freq(observed)
    relative_risk(two_by_two)
    odds_ratio(two_by_two)
    association_cramer(observed)
total_s = time.perf_counter() - start
total_ms = total_s * 1000
mean_ms = total_ms / ITERS

print(json.dumps({
    "function": "contingency",
    "mean_ms": round(mean_ms, 4),
    "iterations": ITERS,
    "total_ms": round(total_ms, 4),
}))
