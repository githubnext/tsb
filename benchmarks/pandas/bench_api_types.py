"""Benchmark: pandas.api.types predicates — is_scalar, is_list_like, is_numeric_dtype, etc."""
import json
import time
import pandas as pd
import numpy as np

WARMUP = 3
ITERATIONS = 30

values = [42, "hello", True, None, [1, 2, 3], {"a": 1}, pd.Timestamp("2020-01-01"), 3.14]
dtypes = [
    np.dtype("int64"),
    np.dtype("float64"),
    np.dtype("bool"),
    np.dtype("O"),
    pd.StringDtype(),
    np.dtype("datetime64[ns]"),
    pd.CategoricalDtype(),
    pd.IntervalDtype(),
]


def run_checks() -> None:
    for v in values:
        pd.api.types.is_scalar(v)
        pd.api.types.is_list_like(v)
        pd.api.types.is_dict_like(v)
        pd.api.types.is_number(v)
        pd.api.types.is_bool(v)
    for d in dtypes:
        pd.api.types.is_numeric_dtype(d)
        pd.api.types.is_integer_dtype(d)
        pd.api.types.is_float_dtype(d)
        pd.api.types.is_bool_dtype(d)
        pd.api.types.is_datetime64_any_dtype(d)
        pd.api.types.is_categorical_dtype(d)
        pd.api.types.is_object_dtype(d)


for _ in range(WARMUP):
    run_checks()

start = time.perf_counter()
for _ in range(ITERATIONS):
    run_checks()
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "api_types",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
