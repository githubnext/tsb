"""Benchmark: pd.json_normalize with record_path, meta fields, and nested data."""
import json, time
import pandas as pd

SIZE = 2_000
WARMUP = 3
ITERATIONS = 20

records = [
    {
        "id": i,
        "dept": f"dept_{i % 10}",
        "location": {"city": f"city_{i % 20}", "country": "US"},
        "employees": [
            {"name": f"emp_{i}_{j}", "salary": (i * 3 + j) * 1000, "active": j % 2 == 0}
            for j in range(3)
        ],
    }
    for i in range(SIZE)
]

for _ in range(WARMUP):
    pd.json_normalize(
        records,
        record_path="employees",
        meta=["id", "dept"],
        meta_prefix="company_",
    )

start = time.perf_counter()
for _ in range(ITERATIONS):
    pd.json_normalize(
        records,
        record_path="employees",
        meta=["id", "dept"],
        meta_prefix="company_",
    )
total = (time.perf_counter() - start) * 1000

print(json.dumps({
    "function": "json_normalize_meta",
    "mean_ms": total / ITERATIONS,
    "iterations": ITERATIONS,
    "total_ms": total,
}))
