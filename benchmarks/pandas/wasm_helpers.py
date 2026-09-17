"""Independent pandas/NumPy counterparts for the bounded kernel-bridge fixtures.

Setup, warmup and final output normalization are outside timing. Natural ordering
uses a standard-library key for this restricted positive-integer ASCII fixture,
not a Python port of the Rust algorithm or an optional natsort dependency.
"""
import json
import math
import re
import time

import numpy as np
import pandas as pd


def numeric_data(size):
    return np.array([(((i * 37) % 1009) - 504) / 8 for i in range(size)], dtype=np.float64)


def natural_data():
    state = 42
    result = []
    for i in range(1000):
        state = (1664525 * state + 1013904223) & 0xFFFFFFFF
        result.append(f"file{state % 10000}_v{i % 100}.txt")
    return result


def natural_key(value):
    return tuple(int(part) if part.isdigit() else part for part in re.split(r"(\d+)", value))


def scalar(data):
    return {"sum_f64": np.sum(data), "mean_f64": np.mean(data),
            "min_f64": np.min(data), "max_f64": np.max(data),
            "var_f64": np.var(data, ddof=1), "std_f64": np.std(data, ddof=1),
            "median_f64": np.median(data)}


def normalize(value):
    if isinstance(value, (pd.Series, np.ndarray)):
        return normalize(value.tolist())
    if isinstance(value, np.generic):
        return normalize(value.item())
    if isinstance(value, dict):
        return {key: normalize(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [normalize(item) for item in value]
    if isinstance(value, float):
        if math.isnan(value):
            return None
        if not math.isfinite(value):
            raise ValueError("Non-finite benchmark result")
        return value
    if value is None or isinstance(value, (str, int, bool)):
        return value
    raise ValueError("Unsupported benchmark result representation")


def workload(name):
    if name == "wasm_accelerated":
        data = np.array([(((i * 37) % 10007) - 5003) / 8 for i in range(10000)], dtype=np.float64)
        ordered = np.sort(data)
        queries = np.array([(((i * 101) % 10007) - 5003) / 8 for i in range(100)], dtype=np.float64)

        def search():
            return {"searchsorted_f64": np.searchsorted(ordered, queries[0], side="left"),
                    "searchsorted_many_f64": np.searchsorted(ordered, queries, side="left"),
                    "argsort_f64": np.argsort(data, kind="stable")}
        return "search-modular-v1:n=10000:queries=100:left:stable-argsort", search

    if name == "wasm_natsort":
        data = natural_data()

        def natural():
            left, right = natural_key("file10.txt"), natural_key("file9.txt")
            return {"nat_compare": (left > right) - (left < right),
                    "nat_sorted": sorted(data, key=natural_key),
                    "nat_argsort": sorted(range(len(data)), key=lambda index: natural_key(data[index]))}
        return "natural-positive-ascii-v1:n=1000:lcg=42", natural

    if name == "wasm_agg_scalar":
        data = numeric_data(10000)
        return "numeric-modular-v1:n=10000:ddof=1", lambda: scalar(data)

    if name not in {"wasm_agg_ops", "wasm_rolling_sum_mean", "wasm_expanding_stats", "wasm_rolling_stats"}:
        raise ValueError("Unknown kernel workload")
    data = numeric_data(1024)
    series = pd.Series(data)
    rolling = series.rolling(window=50, min_periods=2)
    expanding = series.expanding(min_periods=2)
    fixture = "numeric-modular-v1:n=1024:window=50:min_periods=2:ddof=1"

    def sum_mean():
        return {"rolling_sum_f64": rolling.sum(), "rolling_mean_f64": rolling.mean(),
                "expanding_sum_f64": expanding.sum(), "expanding_mean_f64": expanding.mean()}

    def expand():
        return {"expanding_min_f64": expanding.min(), "expanding_max_f64": expanding.max(),
                "expanding_var_f64": expanding.var(ddof=1), "expanding_std_f64": expanding.std(ddof=1),
                "expanding_median_f64": expanding.median()}

    def roll():
        return {"rolling_min_f64": rolling.min(), "rolling_max_f64": rolling.max(),
                "rolling_var_f64": rolling.var(ddof=1), "rolling_std_f64": rolling.std(ddof=1),
                "rolling_median_f64": rolling.median(), **expand()}

    if name == "wasm_agg_ops":
        return fixture, lambda: {**scalar(data), **sum_mean()}
    if name == "wasm_rolling_sum_mean":
        return fixture, sum_mean
    if name == "wasm_expanding_stats":
        return fixture, expand
    return fixture, roll


def main(name):
    fixture, run = workload(name)
    warmup, iterations = 3, 10
    for _ in range(warmup):
        run()
    output = {}
    start = time.perf_counter()
    for _ in range(iterations):
        output = run()
    total = (time.perf_counter() - start) * 1000
    if not math.isfinite(total) or total <= 0:
        raise ValueError("Unresolvable benchmark timing")
    print(json.dumps({"function": name, "mean_ms": total / iterations,
                      "iterations": iterations, "total_ms": total, "backend": "python",
                      "scope": "kernel", "fixture": fixture, "warmup": warmup,
                      "python_implementation": "stdlib-natural-key" if name == "wasm_natsort" else "pandas/numpy",
                      "measurement": "native operation outputs; setup and final normalization excluded",
                      "verification": {"schema_version": 1, "outputs": normalize(output)}}, allow_nan=False))
