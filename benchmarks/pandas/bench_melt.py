"""Benchmark: DataFrame.melt — unpivots wide-format DataFrame to long-format."""
import json, time
import pandas as pd

SIZE = 10_000
WARMUP = 5
ITERATIONS = 50

df = pd.DataFrame({f"col{i}": [float(j*i+0.5) for j in range(SIZE)] for i in range(1, 6)})
id_vars = ["col1"]
value_vars = ["col2", "col3", "col4", "col5"]

for _ in range(WARMUP):
    df.melt(id_vars=id_vars, value_vars=value_vars)

times = []
for _ in range(ITERATIONS):
    t0 = time.perf_counter()
    df.melt(id_vars=id_vars, value_vars=value_vars)
    times.append((time.perf_counter() - t0) * 1000)

total_ms = sum(times)
print(json.dumps({"function":"melt","mean_ms":round(total_ms/ITERATIONS,3),"iterations":ITERATIONS,"total_ms":round(total_ms,3)}))
