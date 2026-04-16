import pandas as pd, time, json
N = 10_000
cols = 4
data = {f"col{c}": [(i % 5) + 1 for i in range(N)] for c in range(cols)}
df = pd.DataFrame(data)
WARMUP = 3
ITERS = 20
for _ in range(WARMUP):
    df.cumprod()
t0 = time.perf_counter()
for _ in range(ITERS):
    df.cumprod()
total = (time.perf_counter() - t0) * 1000
print(json.dumps({"function": "dataframe_cumprod", "mean_ms": total / ITERS, "iterations": ITERS, "total_ms": total}))
