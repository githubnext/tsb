"""
Benchmark: is_named_agg_spec equivalent — check whether all values in a dict
are of a given type (mirrors tsb's isNamedAggSpec guard).
In pandas the equivalent is isinstance-checking NamedAgg namedtuples.
Outputs JSON: {"function": "is_named_agg_spec", "mean_ms": ..., "iterations": ..., "total_ms": ...}
"""
import json
import time
from collections import namedtuple

WARMUP = 5
ITERATIONS = 100

NamedAgg = namedtuple("NamedAgg", ["column", "aggfunc"])


def is_named_agg_spec(spec: dict) -> bool:
    """Return True if every value is a NamedAgg instance."""
    return all(isinstance(v, NamedAgg) for v in spec.values())


# A valid spec — all NamedAgg instances (200 entries).
valid_spec = {f"col_{i}": NamedAgg(f"src_{i % 10}", "sum") for i in range(200)}

# An invalid spec — plain string values.
invalid_spec = {f"col_{i}": "sum" for i in range(200)}

for _ in range(WARMUP):
    is_named_agg_spec(valid_spec)
    is_named_agg_spec(invalid_spec)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    for _ in range(500):
        is_named_agg_spec(valid_spec)
        is_named_agg_spec(invalid_spec)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({
    "function": "is_named_agg_spec",
    "mean_ms": round(total_ms / ITERATIONS, 3),
    "iterations": ITERATIONS,
    "total_ms": round(total_ms, 3),
}))
