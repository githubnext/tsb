import pandas as pd, time, json
N = 100_000
cols = 5
data = {f"col{c}": [(i % 100) * 1.5 for i in range(N)] for c in range(cols)}
df = pd.DataFrame(data)
WARMUP = 3
ITERS = 20
for _ in range(WARMUP):
    df.round(2)
t0 = time.perf_counter()
for _ in range(ITERS):
    df.round(2)
total = (time.perf_counter() - t0) * 1000
print(json.dumps({"function": "dataframe_round", "mean_ms": total / ITERS, "iterations": ITERS, "total_ms": total}))
