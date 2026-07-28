"""
Benchmark: polyval — evaluate a polynomial with given coefficients.
Dataset: degree-5 polynomial evaluated at 100,000 points, 50 iterations.
"""
import json
import time
import numpy as np

N = 100_000
WARMUP = 5
ITERATIONS = 50

# Degree-5 polynomial coefficients [a5, a4, a3, a2, a1, a0]
coefs = [1.5, -2.3, 0.7, 4.1, -0.9, 3.0]
xs = np.linspace(-5.0, 5.0, N)

for _ in range(WARMUP):
    np.polyval(coefs, xs)

start = time.perf_counter()
for _ in range(ITERATIONS):
    np.polyval(coefs, xs)
total = (time.perf_counter() - start) * 1000  # ms

print(json.dumps({
    "function": "polyval",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
