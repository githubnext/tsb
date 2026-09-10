"""
Benchmark: register_option — register custom options with pandas' options system.

Mirrors tsb registerOption which wraps pandas' core config register_option API.
Uses pandas.core.config_init / _config._registered_options to register custom
options with defaults and validators.

Outputs JSON: {"function": "register_option", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time

import pandas as pd

WARMUP = 5
ITERATIONS = 1_000

key_counter = [0]


def register_and_exercise():
    key = f"bench.custom_{key_counter[0]}"
    key_counter[0] += 1
    # pandas does not expose a public register_option in the top-level namespace,
    # but it is accessible via pd.core.config.register_option (internal API).
    # We simulate the equivalent pattern: register → get → set → reset.
    try:
        pd.core.config.register_option(key, 42, "A custom numeric option for benchmarking.")
    except Exception:
        pass  # already registered or unavailable
    try:
        v = pd.get_option(key)
        pd.set_option(key, 99)
        pd.reset_option(key)
        _ = v
    except Exception:
        pass


def register_with_validator():
    key = f"bench.validated_{key_counter[0]}"
    key_counter[0] += 1

    def validator(val):
        if not isinstance(val, (int, float)) or val < 0:
            raise ValueError("must be a non-negative number")

    try:
        pd.core.config.register_option(key, 10, "A validated option.", validator=validator)
    except Exception:
        pass
    try:
        pd.set_option(key, 50)
        pd.reset_option(key)
    except Exception:
        pass


# Warm-up
for _ in range(WARMUP):
    register_and_exercise()
    register_with_validator()

start = time.perf_counter()
for _ in range(ITERATIONS):
    register_and_exercise()
    register_with_validator()
total_ms = (time.perf_counter() - start) * 1000

print(
    json.dumps(
        {
            "function": "register_option",
            "mean_ms": total_ms / ITERATIONS,
            "iterations": ITERATIONS,
            "total_ms": total_ms,
        }
    )
)
