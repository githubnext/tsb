"""Benchmark: Series.astype() — cast Series dtype."""
import json, time
import pandas as pd

SIZE = 100_000
WARMUP = 5
ITERATIONS = 50

float_series = pd.Series([i * 1.5 for i in range(SIZE)])
int_series = pd.Series([i for i in range(SIZE)])

for _ in range(WARMUP):
    float_series.astype("int32")
    int_series.astype("float64")
    int_series.astype("str")

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    float_series.astype("int32")
    int_series.astype("float64")
    int_series.astype("str")
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function":"astype_series","mean_ms":round(total_ms/ITERATIONS,3),"iterations":ITERATIONS,"total_ms":round(total_ms,3)}))
