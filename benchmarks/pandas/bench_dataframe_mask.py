import pandas as pd, time, json
N = 100_000
cols = 4
data = {f"col{c}": [(i % 200) - 100 for i in range(N)] for c in range(cols)}
df = pd.DataFrame(data)
mask = pd.DataFrame({f"col{c}": [i % 3 == 0 for i in range(N)] for c in range(cols)})
WARMUP = 3
ITERS = 20
for _ in range(WARMUP):
    df.mask(mask, other=0)
t0 = time.perf_counter()
for _ in range(ITERS):
    df.mask(mask, other=0)
total = (time.perf_counter() - t0) * 1000
print(json.dumps({"function": "dataframe_mask", "mean_ms": total / ITERS, "iterations": ITERS, "total_ms": total}))
