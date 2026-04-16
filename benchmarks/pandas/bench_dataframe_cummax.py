import pandas as pd, time, json
N = 100_000
cols = 4
data = {f"col{c}": [(i % 100) * 1.0 for i in range(N)] for c in range(cols)}
df = pd.DataFrame(data)
WARMUP = 3
ITERS = 20
for _ in range(WARMUP):
    df.cummax()
t0 = time.perf_counter()
for _ in range(ITERS):
    df.cummax()
total = (time.perf_counter() - t0) * 1000
print(json.dumps({"function": "dataframe_cummax", "mean_ms": total / ITERS, "iterations": ITERS, "total_ms": total}))
