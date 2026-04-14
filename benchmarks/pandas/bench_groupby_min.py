import pandas as pd, time, json
N = 100_000
keys = ["A", "B", "C", "D", "E"]
df = pd.DataFrame({
    "key": [keys[i % len(keys)] for i in range(N)],
    "val": [i * 1.0 for i in range(N)],
})
gb = df.groupby("key")
WARMUP = 3
ITERS = 20
for _ in range(WARMUP):
    gb.min()
t0 = time.perf_counter()
for _ in range(ITERS):
    gb.min()
total = (time.perf_counter() - t0) * 1000
print(json.dumps({"function": "groupby_min", "mean_ms": total / ITERS, "iterations": ITERS, "total_ms": total}))
