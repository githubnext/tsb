"""
Benchmark: pandas.api.types value-level predicate functions —
is_scalar, is_list_like, is_array_like, is_dict_like, is_iterator,
is_number, is_bool, is_float, is_integer, is_named_tuple, is_hashable
"""
import json
import time

import pandas.api.types as pat

WARMUP = 5
ITERATIONS = 5_000

# Representative mixed values (mirrors the TypeScript benchmark)
values = [
    42,
    3.14,
    True,
    False,
    "hello",
    None,
    [1, 2, 3],
    {"a": 1},
    object(),
    (1, 2),  # named-tuple-like
    iter([]),  # iterator
    b"bytes",
    float("nan"),
]


def run_checks():
    for v in values:
        pat.is_scalar(v)
        pat.is_list_like(v)
        pat.is_array_like(v)
        pat.is_dict_like(v)
        pat.is_iterator(v)
        pat.is_number(v)
        pat.is_bool(v)
        pat.is_float(v)
        pat.is_integer(v)
        pat.is_named_tuple(v)
        pat.is_hashable(v)


for _ in range(WARMUP):
    run_checks()

t0 = time.perf_counter()
for _ in range(ITERATIONS):
    run_checks()
total_ms = (time.perf_counter() - t0) * 1000

print(
    json.dumps(
        {
            "function": "value_predicates",
            "mean_ms": total_ms / ITERATIONS,
            "iterations": ITERATIONS,
            "total_ms": total_ms,
        }
    )
)
