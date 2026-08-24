"""
Benchmark: numeric_extended (digitize, histogram, linspace, arange, zscore,
minmax normalization, percentileofscore) using numpy/scipy.
"""
import json
import time
import numpy as np
try:
    from scipy.stats import zscore as sp_zscore, percentileofscore
except ImportError:
    import subprocess, sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "scipy", "-q"])
    from scipy.stats import zscore as sp_zscore, percentileofscore

N = 100_000
WARMUP = 3
ITERS = 20

# Same deterministic dataset as TypeScript version
data = np.array([((i * 2654435761) % 1_000_000) / 10_000 for i in range(N)], dtype=float)
bins20 = np.linspace(0, 100, 21)  # 0,5,...,100

def bench(fn):
    for _ in range(WARMUP):
        fn()
    t0 = time.perf_counter()
    for _ in range(ITERS):
        fn()
    return (time.perf_counter() - t0) / ITERS * 1000  # ms

digitize_ms   = bench(lambda: np.digitize(data, bins20))
histogram_ms  = bench(lambda: np.histogram(data, bins=20))
linspace_ms   = bench(lambda: np.linspace(0, 100, N))
arange_ms     = bench(lambda: np.arange(0, 100, 0.001))
zscore_ms     = bench(lambda: sp_zscore(data, ddof=1))
minmax_ms     = bench(lambda: (data - data.min()) / (data.max() - data.min()))
percentile_ms = bench(lambda: percentileofscore(data, 50.0))

mean_ms = (
    digitize_ms + histogram_ms + linspace_ms + arange_ms +
    zscore_ms + minmax_ms + percentile_ms
) / 7

print(json.dumps({
    "function": "numeric_extended",
    "mean_ms": round(mean_ms, 4),
    "iterations": ITERS,
    "total_ms": round(mean_ms * ITERS, 4),
    "details": {
        "digitize_ms":   round(digitize_ms, 4),
        "histogram_ms":  round(histogram_ms, 4),
        "linspace_ms":   round(linspace_ms, 4),
        "arange_ms":     round(arange_ms, 4),
        "zscore_ms":     round(zscore_ms, 4),
        "minmax_ms":     round(minmax_ms, 4),
        "percentile_ms": round(percentile_ms, 4),
    }
}))
