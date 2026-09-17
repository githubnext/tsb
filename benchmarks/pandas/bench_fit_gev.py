import numpy as np
import json
import time
import math

N = 5000
WARMUP = 5
ITERS = 50


MASK32 = 0xFFFFFFFF


def imul32(x, y):
    """Mirrors JS Math.imul: 32-bit truncated multiplication."""
    return (x * y) & MASK32


def mulberry32(seed):
    """Mirrors the TypeScript mulberry32 PRNG bit-for-bit so both benchmarks
    fit on identical data."""
    a = seed & MASK32

    def next_val():
        nonlocal a
        a = (a + 0x6D2B79F5) & MASK32
        t = imul32((a ^ (a >> 15)) & MASK32, (1 | a) & MASK32)
        t = ((t + imul32((t ^ (t >> 7)) & MASK32, (61 | t) & MASK32)) & MASK32) ^ t
        t &= MASK32
        result = (t ^ (t >> 14)) & MASK32
        return result / 4294967296.0

    return next_val


rand = mulberry32(42)
maxima = np.array(
    [
        -math.log(-math.log(1e-12 if (u := rand()) == 0 else u))
        for _ in range(N)
    ],
    dtype=float,
)


def gamma_fn(z):
    return math.gamma(z)


def estimate_xi_from_tau3(tau3):
    c = 2 / (3 + tau3) - math.log(2) / math.log(3)
    return 7.859 * c + 2.9554 * c * c


def fit_gev(data):
    n = len(data)
    if n < 3:
        return {"mu": 0.0, "sigma": 1.0, "xi": 0.0}

    sorted_data = np.sort(data)

    b0 = 0.0
    b1 = 0.0
    b2 = 0.0
    for i in range(n):
        b0 += sorted_data[i]
        b1 += (i / (n - 1)) * sorted_data[i]
        if n > 2:
            b2 += ((i * (i - 1)) / ((n - 1) * (n - 2))) * sorted_data[i]
    b0 /= n
    b1 /= n
    b2 /= n

    l1 = b0
    l2 = 2 * b1 - b0
    l3 = 6 * b2 - 6 * b1 + b0

    tau3 = l3 / l2 if l2 > 1e-10 else 0.0

    if abs(tau3) < 1e-8:
        xi = 0.0
    else:
        xi = estimate_xi_from_tau3(tau3)

    if abs(xi) < 1e-6:
        sigma = l2 / math.log(2)
        mu = l1 - 0.5772156649 * sigma
    else:
        g1 = gamma_fn(1 - xi)
        sigma = (l2 * xi) / ((1 - 2 ** (-xi)) * g1)
        mu = l1 - (sigma * (g1 - 1)) / xi

    return {"mu": mu, "sigma": max(sigma, 1e-8), "xi": xi}


maxima_list = maxima.tolist()

for _ in range(WARMUP):
    fit_gev(maxima_list)

t0 = time.perf_counter()
for _ in range(ITERS):
    fit_gev(maxima_list)
total_ms = (time.perf_counter() - t0) * 1000

print(
    json.dumps(
        {
            "function": "fit_gev",
            "mean_ms": total_ms / ITERS,
            "iterations": ITERS,
            "total_ms": total_ms,
        }
    )
)
