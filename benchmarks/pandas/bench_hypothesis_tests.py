"""Benchmark: hypothesis_tests — scipy-style hypothesis tests vs pandas/scipy equivalents."""
import json
import math
import time

WARMUP = 3
ITERS = 20
N = 1000


def make_data(n: int, seed: int) -> list:
    arr = []
    x = seed
    for _ in range(n):
        x = (x * 1664525 + 1013904223) & 0xFFFFFFFF
        arr.append((x & 0xFFFFFFFF) / 0x100000000)
    return [v * 4 + 2 for v in arr]


a = make_data(N, 42)
b = make_data(N, 99)

# Pure-numpy/stdlib implementations matching what tsb does
try:
    import numpy as np

    def ttest1samp_np(x, popmean):
        x = np.asarray(x)
        n = len(x)
        mean = x.mean()
        se = x.std(ddof=1) / math.sqrt(n)
        t = (mean - popmean) / se
        return t

    def ttestind_np(x, y):
        x, y = np.asarray(x), np.asarray(y)
        nx, ny = len(x), len(y)
        vx, vy = x.var(ddof=1), y.var(ddof=1)
        se = math.sqrt(vx / nx + vy / ny)
        t = (x.mean() - y.mean()) / se
        return t

    def ttestrel_np(x, y):
        d = np.asarray(x) - np.asarray(y)
        n = len(d)
        t = d.mean() / (d.std(ddof=1) / math.sqrt(n))
        return t

    def foneway_np(*groups):
        grand = np.concatenate(groups)
        grand_mean = grand.mean()
        ss_between = sum(len(g) * (np.mean(g) - grand_mean) ** 2 for g in groups)
        ss_within = sum(((np.asarray(g) - np.mean(g)) ** 2).sum() for g in groups)
        df_between = len(groups) - 1
        df_within = len(grand) - len(groups)
        F = (ss_between / df_between) / (ss_within / df_within)
        return F

    def pearsonr_np(x, y):
        x, y = np.asarray(x), np.asarray(y)
        r = np.corrcoef(x, y)[0, 1]
        return r

    def spearmanr_np(x, y):
        x, y = np.asarray(x), np.asarray(y)
        rx = np.argsort(np.argsort(x)).astype(float)
        ry = np.argsort(np.argsort(y)).astype(float)
        r = np.corrcoef(rx, ry)[0, 1]
        return r

    def mannwhitneyu_np(x, y):
        nx, ny = len(x), len(y)
        all_vals = sorted([(v, 0) for v in x] + [(v, 1) for v in y], key=lambda t: t[0])
        ranks = list(range(1, nx + ny + 1))
        u1 = sum(ranks[i] for i, (_, g) in enumerate(all_vals) if g == 0)
        u1 -= nx * (nx + 1) / 2
        return u1

    HAS_NP = True
except ImportError:
    HAS_NP = False


def bench():
    total = 0.0
    for i in range(WARMUP + ITERS):
        t0 = time.perf_counter()
        if HAS_NP:
            ttest1samp_np(a, 2.5)
            ttestind_np(a, b)
            ttestrel_np(a, b)
            foneway_np(a, b)
            pearsonr_np(a, b)
            spearmanr_np(a, b)
            mannwhitneyu_np(a, b)
        elapsed = (time.perf_counter() - t0) * 1000
        if i >= WARMUP:
            total += elapsed
    mean_ms = total / ITERS
    print(json.dumps({"function": "hypothesis_tests", "mean_ms": mean_ms, "iterations": ITERS, "total_ms": total}))


bench()
